import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-[var(--nero-sf,#111111)] group-[.toaster]:text-[var(--nero-tx,#ededed)] group-[.toaster]:border-[var(--nero-bd,#262626)] group-[.toaster]:shadow-lg rounded-xl font-sans",
          description: "group-[.toast]:text-[var(--nero-mu,#9a9a9a)]",
          actionButton:
            "group-[.toast]:bg-[var(--nero-g,#19e68c)] group-[.toast]:text-[var(--nero-on,#04130c)] font-medium",
          cancelButton:
            "group-[.toast]:bg-[var(--nero-sf2,#1a1a1a)] group-[.toast]:text-[var(--nero-mu,#9a9a9a)]",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
