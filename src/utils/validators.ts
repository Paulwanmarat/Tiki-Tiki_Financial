export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateAmount(amount: string | number): ValidationResult {
  const errors: string[] = [];
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(num)) {
    errors.push('Amount must be a valid number');
  } else if (num <= 0) {
    errors.push('Amount must be greater than 0');
  } else if (num > 999_999_999_999) {
    errors.push('Amount is too large');
  }

  return { isValid: errors.length === 0, errors };
}

export function validateRequired(value: string, fieldName: string): ValidationResult {
  const errors: string[] = [];
  if (!value || value.trim().length === 0) {
    errors.push(`${fieldName} is required`);
  }
  return { isValid: errors.length === 0, errors };
}

export function validateDate(dateStr: string): ValidationResult {
  const errors: string[] = [];
  const date = new Date(dateStr);

  if (isNaN(date.getTime())) {
    errors.push('Please enter a valid date');
  }

  return { isValid: errors.length === 0, errors };
}

export function validateTransaction(data: {
  amount: string | number;
  categoryId: string;
  date: string;
}): ValidationResult {
  const errors: string[] = [];

  const amountResult = validateAmount(data.amount);
  errors.push(...amountResult.errors);

  if (!data.categoryId) {
    errors.push('Please select a category');
  }

  const dateResult = validateDate(data.date);
  errors.push(...dateResult.errors);

  return { isValid: errors.length === 0, errors };
}

export function validateGoal(data: {
  name: string;
  targetAmount: string | number;
  targetDate: string;
}): ValidationResult {
  const errors: string[] = [];

  const nameResult = validateRequired(data.name, 'Goal name');
  errors.push(...nameResult.errors);

  const amountResult = validateAmount(data.targetAmount);
  errors.push(...amountResult.errors);

  const dateResult = validateDate(data.targetDate);
  errors.push(...dateResult.errors);

  const targetDate = new Date(data.targetDate);
  if (!isNaN(targetDate.getTime()) && targetDate <= new Date()) {
    errors.push('Target date must be in the future');
  }

  return { isValid: errors.length === 0, errors };
}
