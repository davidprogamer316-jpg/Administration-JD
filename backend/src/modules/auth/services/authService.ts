import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AdminUser, IAdminUser } from '../models';
import { env } from '../../../config/env';

function generateToken(user: IAdminUser): string {
  return jwt.sign({ id: user._id.toString() }, env.jwtSecret, {
    expiresIn: 86400,
  });
}

export async function register(
  email: string,
  password: string,
  fullName: string
) {
  const existingCount = await AdminUser.countDocuments();
  if (existingCount > 0) {
    const existing = await AdminUser.findOne({ email: email.toLowerCase() });
    if (!existing) {
      throw new Error('El registro solo está habilitado para el primer usuario');
    }
    throw new Error('El correo ya está registrado');
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await AdminUser.create({
    email: email.toLowerCase(),
    passwordHash,
    fullName,
  });

  const token = generateToken(user);

  return {
    token,
    user: {
      _id: user._id,
      email: user.email,
      fullName: user.fullName,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      lockedUntil: user.lockedUntil,
    },
  };
}

export async function login(email: string, password: string) {
  const user = await AdminUser.findOne({ email: email.toLowerCase() });

  if (!user) {
    throw Object.assign(new Error('Credenciales inválidas'), { status: 401 });
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw Object.assign(
      new Error(
        'Cuenta bloqueada por demasiados intentos. Intenta de nuevo más tarde.'
      ),
      { status: 423, locked: true }
    );
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    user.failedLoginAttempts += 1;

    if (user.failedLoginAttempts >= env.loginMaxAttempts) {
      user.lockedUntil = new Date(
        Date.now() + env.loginLockDurationMinutes * 60 * 1000
      );
    }

    await user.save();

    throw Object.assign(new Error('Credenciales inválidas'), { status: 401 });
  }

  user.failedLoginAttempts = 0;
  user.lockedUntil = null;
  user.lastLogin = new Date();
  await user.save();

  const token = generateToken(user);

  return {
    token,
    user: {
      _id: user._id,
      email: user.email,
      fullName: user.fullName,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      lockedUntil: user.lockedUntil,
    },
  };
}

export async function getMe(userId: string) {
  const user = await AdminUser.findById(userId);
  if (!user) {
    throw Object.assign(new Error('Usuario no encontrado'), { status: 404 });
  }

  return {
    _id: user._id,
    email: user.email,
    fullName: user.fullName,
    createdAt: user.createdAt,
    lastLogin: user.lastLogin,
    lockedUntil: user.lockedUntil,
  };
}

export async function unlockAccount(userId: string) {
  const user = await AdminUser.findById(userId);
  if (!user) {
    throw Object.assign(new Error('Usuario no encontrado'), { status: 404 });
  }

  user.failedLoginAttempts = 0;
  user.lockedUntil = null;
  await user.save();

  return { message: 'Cuenta desbloqueada exitosamente' };
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
) {
  const user = await AdminUser.findById(userId);
  if (!user) {
    throw Object.assign(new Error('Usuario no encontrado'), { status: 404 });
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    throw Object.assign(new Error('Contraseña actual incorrecta'), {
      status: 400,
    });
  }

  user.passwordHash = await bcrypt.hash(newPassword, 12);
  await user.save();

  return { message: 'Contraseña actualizada exitosamente' };
}
