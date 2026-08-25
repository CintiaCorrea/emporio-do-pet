'use client';
import { useState, InputHTMLAttributes } from 'react';

// Campo numérico que aceita vírgula E ponto sem "comer" o separador enquanto digita.
// Guarda o texto cru enquanto está em edição (buffer) e reporta o número já convertido
// via onValue — assim toda a matemática a jusante continua trabalhando com number.
const parse = (s: string) => Number(String(s ?? '').replace(',', '.')) || 0;

type Props = { value: number; onValue: (n: number) => void } & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>;

export default function DecimalInput({ value, onValue, onBlur, ...rest }: Props) {
  const [buf, setBuf] = useState<string | null>(null);
  const shown = buf !== null ? buf : (value ? String(value).replace('.', ',') : '');
  return (
    <input
      {...rest}
      inputMode="decimal"
      value={shown}
      onChange={(e) => { setBuf(e.target.value); onValue(parse(e.target.value)); }}
      onBlur={(e) => { setBuf(null); onBlur?.(e); }}
    />
  );
}
