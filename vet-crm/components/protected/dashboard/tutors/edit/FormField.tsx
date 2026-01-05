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
        className="flex items-center text-sm font-semibold text-gray-700"
      >
        {icon}
        {label} {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {description && (
        <p className="text-xs text-gray-500 mt-1">{description}</p>
      )}
    </div>
  );
}
