interface EnvVarSpec {
  key: string;
  required: boolean;
  type: 'string' | 'url' | 'boolean' | 'number';
  defaultValue?: string | number | boolean;
  description: string;
}

const ENV_SPECS: EnvVarSpec[] = [
  { key: 'VITE_RAG_API_URL', required: true, type: 'url', description: 'RAG API 基础地址' },
  { key: 'VITE_API_BASE_URL', required: false, type: 'string', description: 'API 备用基础地址' },
  { key: 'VITE_QWEN_API_KEY', required: false, type: 'string', description: '通义千问 API Key' },
  { key: 'VITE_QWEN_MODEL', required: false, type: 'string', defaultValue: 'qwen-plus', description: 'Qwen 模型名称' },
  { key: 'VITE_HUPIJAO_APP_ID', required: false, type: 'string', description: '虎皮椒 App ID' },
  { key: 'VITE_HUPIJAO_APP_SECRET', required: false, type: 'string', description: '虎皮椒 App Secret' },
  { key: 'VITE_SENTRY_DSN', required: false, type: 'url', description: 'Sentry DSN' },
  { key: 'VITE_APP_NAME', required: false, type: 'string', defaultValue: '评语助手', description: '应用名称' },
];

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  config: Record<string, string>;
}

function getEnvValue(key: string): string | undefined {
  // @ts-expect-error process is a Node.js global
  const value = import.meta.env?.[key] ?? (typeof process !== 'undefined' ? process.env[key] : undefined);
  if (value === '' || value === undefined || value === null) return undefined;
  return String(value);
}

export function validateEnv(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const config: Record<string, string> = {};

  for (const spec of ENV_SPECS) {
    const value = getEnvValue(spec.key);

    if (value !== undefined) {
      config[spec.key] = value;

      if (spec.type === 'url') {
        try {
          new URL(value);
        } catch {
          errors.push(`[环境变量] ${spec.key} 不是有效的 URL: ${value}`);
        }
      }
    } else if (spec.required) {
      errors.push(`[环境变量] 缺少必需变量: ${spec.key} (${spec.description})`);
    } else if (spec.defaultValue !== undefined) {
      config[spec.key] = String(spec.defaultValue);
      warnings.push(`[环境变量] ${spec.key} 使用默认值: ${spec.defaultValue}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    config,
  };
}

export function getEnvOrThrow(key: string): string {
  const value = getEnvValue(key);
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}
