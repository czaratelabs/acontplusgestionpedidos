import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemSetting, SYSTEM_TIMEZONE_KEY, SYSTEM_CURRENCY_KEY, SYSTEM_DATE_FORMAT_KEY } from './entities/system-setting.entity';

const DEFAULT_TIMEZONE = 'America/Guayaquil';
const DEFAULT_CURRENCY = 'USD';
const DEFAULT_DATE_FORMAT = 'DD/MM/YYYY';

const VALID_CURRENCY_CODES = ['USD', 'EUR', 'COP', 'PEN', 'MXN', 'CLP'];

const VALID_DATE_FORMATS = ['DD/MM/YYYY', 'YYYY-MM-DD', 'MM/DD/YYYY', 'DD de MMM, YYYY'];

@Injectable()
export class SystemSettingsService {
  constructor(
    @InjectRepository(SystemSetting)
    private readonly repo: Repository<SystemSetting>,
  ) {}

  async findAllByCompany(companyId: string): Promise<SystemSetting[]> {
    return this.repo.find({
      where: { companyId },
      order: { key: 'ASC' },
    });
  }

  async findOne(companyId: string, key: string): Promise<SystemSetting> {
    const setting = await this.repo.findOne({
      where: { companyId, key },
    });
    if (!setting) {
      throw new NotFoundException(`Configuración no encontrada: ${key} para esta empresa`);
    }
    return setting;
  }

  async getValue(companyId: string, key: string): Promise<string | null> {
    const setting = await this.repo.findOne({
      where: { companyId, key },
    });
    return setting?.value ?? null;
  }

  async update(
    companyId: string,
    key: string,
    value: string,
    description?: string | null,
  ): Promise<SystemSetting> {
    if (key === SYSTEM_CURRENCY_KEY) {
      const code = value?.trim()?.toUpperCase();
      if (!code || code.length !== 3 || !VALID_CURRENCY_CODES.includes(code)) {
        throw new BadRequestException(
          `Valor inválido para moneda. Use un código ISO 4217 de 3 letras: ${VALID_CURRENCY_CODES.join(', ')}`,
        );
      }
      value = code;
    }

    if (key === SYSTEM_DATE_FORMAT_KEY) {
      const format = value?.trim();
      if (!format || !VALID_DATE_FORMATS.includes(format)) {
        throw new BadRequestException(
          `Formato de fecha inválido. Valores permitidos: ${VALID_DATE_FORMATS.join(', ')}`,
        );
      }
      value = format;
    }

    const setting = await this.repo.findOne({
      where: { companyId, key },
    });
    if (!setting) {
      const created = this.repo.create({
        companyId,
        key,
        value,
        description: description ?? null,
      });
      return this.repo.save(created);
    }
    setting.value = value;
    if (description !== undefined) setting.description = description ?? null;
    return this.repo.save(setting);
  }

  /**
   * Get timezone value for a company (for audit/formatting). Returns default if not set.
   */
  async getTimezoneForCompany(companyId: string): Promise<string> {
    const value = await this.getValue(companyId, SYSTEM_TIMEZONE_KEY);
    return value?.trim() ?? DEFAULT_TIMEZONE;
  }

  /**
   * Get currency ISO code for a company (for prices/totals formatting). Returns default if not set.
   */
  async getCurrencyForCompany(companyId: string): Promise<string> {
    const value = await this.getValue(companyId, SYSTEM_CURRENCY_KEY);
    const code = value?.trim()?.toUpperCase();
    return code && VALID_CURRENCY_CODES.includes(code) ? code : DEFAULT_CURRENCY;
  }

  /**
   * Get date format for a company. Returns default DD/MM/YYYY if not set.
   */
  async getDateFormatForCompany(companyId: string): Promise<string> {
    const value = await this.getValue(companyId, SYSTEM_DATE_FORMAT_KEY);
    const format = value?.trim();
    return format && VALID_DATE_FORMATS.includes(format) ? format : DEFAULT_DATE_FORMAT;
  }
}
