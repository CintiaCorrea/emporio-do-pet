interface FormFieldProps {
  label: string;
  htmlFor: string;
  required?: boolean;
  children: React.ReactNode;
}

export default function FormField({ label, htmlFor, required = false, children }: FormFieldProps) {
  return (
    <div className="space-y-4">
      <label htmlFor={htmlFor} className="block text-lg font-semibold text-gray-900">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}
