import { randomBytes } from 'crypto';
import { UserCredentials } from '../api/types';

export class DataGenerator {
  private static hex(bytes = 4): string {
    return randomBytes(bytes).toString('hex');
  }

  static generateUsername(): string {
    // Short enough to fit ParaBank's username field, unique per run
    return `qa_${this.hex(4)}`;
  }

  static generatePassword(): string {
    return `Pwd@${this.hex(3).toUpperCase()}`;
  }

  static generateSSN(): string {
    const rand = (min: number, max: number) =>
      String(Math.floor(Math.random() * (max - min + 1)) + min).padStart(
        min.toString().length,
        '0'
      );
    return `${rand(100, 999)}-${rand(10, 99)}-${rand(1000, 9999)}`;
  }

  static generateUser(): UserCredentials {
    const tag = this.hex(3);
    return {
      firstName: `Test${tag}`,
      lastName: `User${tag}`,
      address: {
        street: '42 Automation Ave',
        city: 'Testville',
        state: 'CA',
        zipCode: '90210',
      },
      phoneNumber: '555-010-1234',
      ssn: this.generateSSN(),
      username: this.generateUsername(),
      password: this.generatePassword(),
    };
  }
}
