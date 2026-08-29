type ImpersonateFormProps = {
  organizationId: string;
  next?: string;
  label: string;
  className?: string;
};

export function ImpersonateForm({ organizationId, next, label, className }: ImpersonateFormProps) {
  return (
    <form action="/api/form/impersonate" method="post">
      <input type="hidden" name="organizationId" value={organizationId} />
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <button className={className || "btn"} type="submit">
        {label}
      </button>
    </form>
  );
}
