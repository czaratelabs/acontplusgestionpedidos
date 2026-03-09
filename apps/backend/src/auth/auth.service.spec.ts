import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { CompaniesService } from '../companies/companies.service';
import { RolesService } from '../roles/roles.service';
import { RegisterDto } from './dto/register.dto';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let companiesService: jest.Mocked<CompaniesService>;
  let rolesService: jest.Mocked<RolesService>;
  let jwtService: jest.Mocked<JwtService>;

  const mockUser = {
    id: 'user-1',
    full_name: 'Usuario Test',
    email: 'test@example.com',
    password_hash: '',
    is_active: true,
    is_super_admin: false,
    created_at: new Date(),
    userCompanies: [
      {
        id: 'uc-1',
        userId: 'user-1',
        companyId: 'company-1',
        roleId: 'role-1',
        isActive: true,
        company: { id: 'company-1', name: 'Empresa 1' },
        role: { id: 'role-1', name: 'admin', permissions: {} },
      },
    ],
  };

  let mockSuperAdmin: typeof mockUser & { id: string; email: string; is_super_admin: boolean; userCompanies: never[] };

  beforeEach(async () => {
    const mockPasswordHash = await bcrypt.hash('password123', 10);
    mockUser.password_hash = mockPasswordHash;
    mockSuperAdmin = {
      ...mockUser,
      id: 'super-1',
      email: 'super@example.com',
      password_hash: mockPasswordHash,
      is_super_admin: true,
      userCompanies: [],
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findOneByEmail: jest.fn(),
            findOneById: jest.fn(),
            createEmployee: jest.fn(),
          },
        },
        {
          provide: CompaniesService,
          useValue: {
            create: jest.fn(),
          },
        },
        {
          provide: RolesService,
          useValue: {
            findByNameForCompany: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn().mockResolvedValue('jwt-token-123'),
            verifyAsync: jest.fn().mockResolvedValue({ sub: 'user-1', purpose: 'company_selection' }),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    companiesService = module.get(CompaniesService);
    rolesService = module.get(RolesService);
    jwtService = module.get(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('2.1.1.1 - Login con credenciales válidas → retorna JWT y usuario', () => {
    it('retorna access_token y user cuando las credenciales son correctas y tiene una empresa', async () => {
      (usersService.findOneByEmail as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.signIn('test@example.com', 'password123');

      expect('access_token' in result).toBe(true);
      expect('user' in result).toBe(true);
      if ('access_token' in result) {
        expect(result.access_token).toBe('jwt-token-123');
        expect(result.user.email).toBe('test@example.com');
        expect(result.user.name).toBe('Usuario Test');
        expect(result.user.companyId).toBe('company-1');
        expect(result.user.role).toBe('admin');
      }
    });

    it('retorna access_token y user para SuperAdmin sin empresa', async () => {
      (usersService.findOneByEmail as jest.Mock).mockResolvedValue(mockSuperAdmin);

      const result = await service.signIn('super@example.com', 'password123');

      expect('access_token' in result).toBe(true);
      if ('access_token' in result) {
        expect(result.access_token).toBe('jwt-token-123');
        expect(result.user.isSuperAdmin).toBe(true);
        expect(result.user.companyId).toBeNull();
      }
    });
  });

  describe('2.1.1.2 - Login con credenciales inválidas → lanza UnauthorizedException', () => {
    it('lanza UnauthorizedException cuando el email no existe', async () => {
      (usersService.findOneByEmail as jest.Mock).mockResolvedValue(null);

      await expect(service.signIn('noexiste@example.com', 'password123')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.signIn('noexiste@example.com', 'password123')).rejects.toThrow(
        'Credenciales incorrectas',
      );
    });

    it('lanza UnauthorizedException cuando la contraseña es incorrecta', async () => {
      (usersService.findOneByEmail as jest.Mock).mockResolvedValue(mockUser);

      await expect(service.signIn('test@example.com', 'wrongpassword')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.signIn('test@example.com', 'wrongpassword')).rejects.toThrow(
        'Credenciales incorrectas',
      );
    });

    it('lanza UnauthorizedException cuando el usuario no tiene empresas asignadas', async () => {
      const userSinEmpresas = { ...mockUser, userCompanies: [] };
      (usersService.findOneByEmail as jest.Mock).mockResolvedValue(userSinEmpresas);

      await expect(service.signIn('test@example.com', 'password123')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.signIn('test@example.com', 'password123')).rejects.toThrow(
        'Usuario sin acceso a ninguna empresa',
      );
    });
  });

  describe('2.1.1.3 - Generación correcta de JWT (payload: sub, email, role, companyId)', () => {
    it('genera JWT con payload correcto (sub, companyId, role)', async () => {
      (usersService.findOneByEmail as jest.Mock).mockResolvedValue(mockUser);
      (jwtService.signAsync as jest.Mock).mockImplementation((payload) =>
        Promise.resolve(JSON.stringify(payload)),
      );

      const result = await service.signIn('test@example.com', 'password123');

      expect('access_token' in result).toBe(true);
      if ('access_token' in result) {
        const payload = JSON.parse(result.access_token);
        expect(payload.sub).toBe('user-1');
        expect(payload.companyId).toBe('company-1');
        expect(payload.role).toBe('admin');
        expect(payload.username).toBe('test@example.com');
      }
    });
  });

  describe('2.1.1.4 - register() crea usuario y empresa correctamente', () => {
    it('crea empresa y usuario empleado correctamente', async () => {
      const registerDto: RegisterDto = {
        company_name: 'Nueva Empresa',
        company_ruc_nit: '1234567890001',
        full_name: 'Admin Nuevo',
        email: 'admin@nueva.com',
        password: 'password123',
      };

      (usersService.findOneByEmail as jest.Mock).mockResolvedValue(null);
      (rolesService.findByNameForCompany as jest.Mock).mockResolvedValue({ id: 'role-admin' });
      (companiesService.create as jest.Mock).mockResolvedValue({
        id: 'company-new',
        name: registerDto.company_name,
      });
      (usersService.createEmployee as jest.Mock).mockResolvedValue({
        id: 'user-new',
        full_name: registerDto.full_name,
        email: registerDto.email,
      });

      const result = await service.register(registerDto);

      expect(result.message).toBe('Cuenta creada correctamente. Ya puedes iniciar sesión.');
      expect(result.companyId).toBe('company-new');
      expect(companiesService.create).toHaveBeenCalledWith({
        name: registerDto.company_name,
        ruc_nit: registerDto.company_ruc_nit,
      });
      expect(usersService.createEmployee).toHaveBeenCalledWith('company-new', {
        full_name: registerDto.full_name,
        email: registerDto.email,
        password: registerDto.password,
        role: 'admin',
      });
    });

    it('lanza ConflictException cuando el email ya existe', async () => {
      const registerDto: RegisterDto = {
        company_name: 'Empresa',
        company_ruc_nit: '1234567890001',
        full_name: 'Admin',
        email: 'existente@example.com',
        password: 'password123',
      };

      (usersService.findOneByEmail as jest.Mock).mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
      await expect(service.register(registerDto)).rejects.toThrow(
        'Ya existe una cuenta con este correo electrónico',
      );
      expect(companiesService.create).not.toHaveBeenCalled();
    });
  });

  describe('2.1.1.5 - selectCompany() actualiza companyId en token', () => {
    it('retorna nuevo access_token con companyId actualizado', async () => {
      const mockUserWithCompanies = {
        ...mockUser,
        userCompanies: [
          {
            id: 'uc-1',
            companyId: 'company-1',
            isActive: true,
            company: { id: 'company-1', name: 'Empresa 1' },
            role: { id: 'role-1', name: 'admin', permissions: {} },
          },
          {
            id: 'uc-2',
            companyId: 'company-2',
            isActive: true,
            company: { id: 'company-2', name: 'Empresa 2' },
            role: { id: 'role-2', name: 'seller', permissions: {} },
          },
        ],
      };

      (jwtService.verifyAsync as jest.Mock).mockResolvedValue({
        sub: 'user-1',
        purpose: 'company_selection',
      });
      (usersService.findOneById as jest.Mock).mockResolvedValue(mockUserWithCompanies);
      (jwtService.signAsync as jest.Mock).mockResolvedValue('new-jwt-token');

      const result = await service.selectCompany('session-token', 'company-2');

      expect(result.access_token).toBe('new-jwt-token');
      expect(result.user.companyId).toBe('company-2');
      expect(result.user.role).toBe('seller');
    });

    it('lanza error cuando el token es inválido (verifyAsync falla)', async () => {
      (jwtService.verifyAsync as jest.Mock).mockRejectedValue(new Error('Token inválido'));

      await expect(service.selectCompany('invalid-token', 'company-1')).rejects.toThrow(
        'Token inválido',
      );
    });

    it('lanza UnauthorizedException cuando el usuario no tiene acceso a la empresa', async () => {
      (jwtService.verifyAsync as jest.Mock).mockResolvedValue({
        sub: 'user-1',
        purpose: 'company_selection',
      });
      (usersService.findOneById as jest.Mock).mockResolvedValue(mockUser);

      await expect(service.selectCompany('session-token', 'company-inexistente')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.selectCompany('session-token', 'company-inexistente')).rejects.toThrow(
        'No tienes acceso a esta empresa',
      );
    });
  });
});
