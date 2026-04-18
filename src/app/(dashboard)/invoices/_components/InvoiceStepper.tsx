import { Check } from "lucide-react";

type InvoiceStepperProps = {
  step: number;
};

export function InvoiceStepper({ step }: InvoiceStepperProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {[1, 2, 3].map((currentStep) => (
          <div key={currentStep} className="flex flex-1 items-center">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full font-semibold ${
                currentStep < step
                  ? "bg-green-600 text-white"
                  : currentStep === step
                    ? "bg-brand-primary text-white"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {currentStep < step ? <Check className="h-5 w-5" /> : currentStep}
            </div>
            <div className="ml-4 flex-1">
              <div className="font-medium text-foreground">
                {currentStep === 1 && "Informações"}
                {currentStep === 2 && "Itens"}
                {currentStep === 3 && "Revisão"}
              </div>
              <div className="text-sm text-muted-foreground">
                {currentStep === 1 && "Cliente e projeto"}
                {currentStep === 2 && "Adicionar itens"}
                {currentStep === 3 && "Confirmar e criar"}
              </div>
            </div>
            {currentStep < 3 && (
              <div className="mx-4 h-1 flex-1 bg-muted">
                <div
                  className={`h-full ${currentStep < step ? "bg-green-600" : "bg-muted"}`}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
