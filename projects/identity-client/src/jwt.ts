import { jwtDecode } from 'jwt-decode';

export interface AuthClaims {
  id: string | null;
  roles: string[];
  accessRights: string[];
  controllerActions: string[];
  mustChangePassword: boolean;
  exp: number | null;
}

export class SardanapalJwtService {
  decode(token: string): AuthClaims | null {
    try {
      const payload: unknown = jwtDecode(token);
      if (!payload || typeof payload !== 'object') {
        return null;
      }
      const record = payload as Record<string, unknown>;
      return {
        id: this.readId(record['id']),
        roles: this.claimList(record['sd_roles']),
        accessRights: this.claimList(record['AccessRight']),
        controllerActions: this.claimList(record['sd_controller_action']),
        mustChangePassword: this.isTrue(record['must_change_pw']),
        exp: this.readExp(record['exp']),
      };
    } catch {
      return null;
    }
  }

  private claimList(value: unknown): string[] {
    if (typeof value === 'string' || typeof value === 'number') {
      return [String(value)];
    }
    if (!Array.isArray(value)) {
      return [];
    }
    return value.flatMap((item) =>
      typeof item === 'string' || typeof item === 'number' ? [String(item)] : [],
    );
  }

  private readId(value: unknown): string | null {
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }
    return null;
  }

  private readExp(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  }

  private isTrue(value: unknown): boolean {
    return value === true || value === 'true';
  }
}
