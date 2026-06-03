import { useState } from 'react';

// 表单验证规则和工具函数

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
  message?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

// 预定义验证规则
export const VALIDATION_RULES = {
  email: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: '请输入有效的邮箱地址'
  },
  
  password: {
    required: true,
    minLength: 6,
    maxLength: 50,
    message: '密码长度应在6-50个字符之间'
  },
  
  name: {
    required: true,
    minLength: 2,
    maxLength: 20,
    message: '姓名长度应在2-20个字符之间'
  },
  
  studentName: {
    required: true,
    minLength: 1,
    maxLength: 10,
    message: '学生姓名不能为空且不超过10个字符'
  },
  
  className: {
    required: true,
    minLength: 1,
    maxLength: 20,
    message: '班级名称不能为空且不超过20个字符'
  },

  commentContent: {
    required: true,
    minLength: 10,
    message: '评语内容至少10个字符'
  }
};

/**
 * 验证单个字段
 */
export function validateField(
  value: any,
  rules: ValidationRule
): string | null {
  // Required check
  if (rules.required && (!value || (typeof value === 'string' && !value.trim()))) {
    return rules.message || '此字段为必填项';
  }

  // 如果值为空且非必填，跳过其他验证
  if (!value || (typeof value === 'string' && !value.trim())) {
    return null;
  }

  // Min length check
  if (rules.minLength !== undefined && typeof value === 'string' && value.length < rules.minLength) {
    return rules.message || `长度不能少于${rules.minLength}个字符`;
  }

  // Max length check
  if (rules.maxLength !== undefined && typeof value === 'string' && value.length > rules.maxLength) {
    return rules.message || `长度不能超过${rules.maxLength}个字符`;
  }

  // Pattern check
  if (rules.pattern && typeof value === 'string' && !rules.pattern.test(value)) {
    return rules.message || '格式不正确';
  }

  // Custom validation
  if (rules.custom) {
    return rules.custom(value);
  }

  return null;
}

/**
 * 验证整个表单
 */
export function validateForm(
  values: Record<string, any>,
  fieldRules: Record<string, ValidationRule>
): ValidationResult {
  const errors: Record<string, string> = {};
  let isValid = true;

  for (const [field, rules] of Object.entries(fieldRules)) {
    const error = validateField(values[field], rules);
    if (error) {
      errors[field] = error;
      isValid = false;
    }
  }

  return { isValid, errors };
}

/**
 * 常用验证器
 */
export const validators = {
  isEmail: (value: string): boolean => {
    return VALIDATION_RULES.email.pattern!.test(value);
  },

  isPasswordStrong: (value: string): boolean => {
    // 至少包含大小写字母、数字
    const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/;
    return strongRegex.test(value);
  },

  isChineseName: (value: string): boolean => {
    const chineseNameRegex = /^[\u4e00-\u9fa5]{2,10}$/;
    return chineseNameRegex.test(value);
  },

  isPhoneNumber: (value: string): boolean => {
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(value);
  },

  isURL: (value: string): boolean => {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  },

  noSpecialChars: (value: string): boolean => {
    const specialCharsRegex = /[<>\"'&]/;
    return !specialCharsRegex.test(value);
  },

  maxWords: (value: string, max: number): boolean => {
    const words = value.trim().split(/\s+/);
    return words.length <= max;
  },

  minWords: (value: string, min: number): boolean => {
    const words = value.trim().split(/\s+/);
    return words.length >= min;
  }
};

/**
 * 实时验证 Hook 辅助函数
 */
export function useFormValidation<T extends Record<string, any>>(
  initialValues: T,
  validationRules: Record<string, ValidationRule>
) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const handleChange = (field: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [field]: value }));

    // Real-time validation after first touch
    if (touched[field as string]) {
      const error = validateField(value, validationRules[field as string]);
      setErrors(prev => ({
        ...prev,
        [field]: error || ''
      }));
    }
  };

  const handleBlur = (field: keyof T) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    
    const error = validateField(values[field], validationRules[field as string]);
    setErrors(prev => ({
      ...prev,
      [field]: error || ''
    }));
  };

  const validate = (): ValidationResult => {
    return validateForm(values, validationRules);
  };

  const reset = () => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  };

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    validate,
    reset,
    isValid: Object.keys(errors).every(key => !errors[key])
  };
}
