import * as bcrypt from 'bcrypt';
import { IPasswordHasherPort } from '../domain/IPasswordHasherPort';

export class BcryptPasswordHasher implements IPasswordHasherPort {
  private readonly saltRounds = 10;

  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  async compare(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
