import * as React from 'react';
import { FormProvider, Controller, useFormContext } from 'react-hook-form';
import { cn } from '../../utils/cn';

export const Form = FormProvider;
const FormFieldContext = React.createContext({});
export const FormField = ({ control, name, render }) => (
  <FormFieldContext.Provider value={{ name }}>
    <Controller control={control} name={name} render={render} />
  </FormFieldContext.Provider>
);

const FormItemContext = React.createContext({});

export const FormItem = React.forwardRef(({ className, ...props }, ref) => {
  const id = React.useId();
  return (
    <FormItemContext.Provider value={{ id }}>
      <div ref={ref} className={cn('space-y-1.5', className)} {...props} />
    </FormItemContext.Provider>
  );
});
FormItem.displayName = 'FormItem';

export const FormLabel = React.forwardRef(({ className, ...props }, ref) => {
  const { id } = React.useContext(FormItemContext);
  return <label ref={ref} htmlFor={id} className={cn('text-[13px] font-semibold text-foreground/85 flex items-center justify-between select-none tracking-normal', className)} {...props} />;
});
FormLabel.displayName = 'FormLabel';

export const FormControl = React.forwardRef(({ children, ...props }, ref) => {
  const { id } = React.useContext(FormItemContext);
  return React.cloneElement(children, { id, ref, ...props });
});
FormControl.displayName = 'FormControl';

export const FormMessage = ({ className }) => {
  const { name } = React.useContext(FormFieldContext);
  const { formState } = useFormContext();
  const message = name ? formState.errors?.[name]?.message : undefined;
  return message ? <p className={cn('text-xs font-medium text-destructive mt-1', className)}>{message}</p> : null;
};
