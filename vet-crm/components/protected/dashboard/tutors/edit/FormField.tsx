interface FormFieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  children: React.ReactNode;
  icon?: React.ReactNode;
  description?: string;
}

export default function FormField({
  label,
  htmlFor,
  required = false,
  children,
  icon,
  description
}: FormFieldProps) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={htmlFor}
        className="flex items-center"
        style={{ fontSize: '13px', fontWeight: 500, color: '#5C6B70' }}
      >
        {icon}
        {label} {required && <span className="ml-1" style={{ color: '#D85A30' }}>*</span>}
      </label>
      {children}
      {description && (
        <p className="mt-1" style={{ fontSize: '12px', color: '#8A989D' }}>{description}</p>
      )}
    </div>
  );
}
