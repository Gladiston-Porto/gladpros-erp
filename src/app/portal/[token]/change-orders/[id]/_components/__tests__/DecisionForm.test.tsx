import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import DecisionForm from "../DecisionForm";

describe("DecisionForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    jest.spyOn(window, "confirm").mockReturnValue(true);
  });

  afterEach(() => {
    (window.confirm as jest.Mock).mockRestore?.();
  });

  it("bloqueia ação sem nome válido", () => {
    render(
      <DecisionForm
        token="token-teste"
        changeOrderId="10"
        initialStatus="PENDING"
        decidedAt={null}
        decidedBy={null}
      />
    );

    const approveButton = screen.getByRole("button", { name: "Aprovar" });
    const rejectButton = screen.getByRole("button", { name: "Rejeitar" });

    expect(approveButton).toBeDisabled();
    expect(rejectButton).toBeDisabled();
  });

  it("envia payload esperado para approve", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        status: "approved",
        decidedAt: "2026-02-22T13:00:00.000Z",
        decidedBy: "Cliente Portal",
      }),
    });

    render(
      <DecisionForm
        token="token-teste"
        changeOrderId="10"
        initialStatus="PENDING"
        decidedAt={null}
        decidedBy={null}
      />
    );

    fireEvent.change(screen.getByLabelText("Seu nome"), {
      target: { value: "Cliente Portal" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Aprovar" }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/portal/token-teste/change-orders/10/decision",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          action: "APPROVE",
          name: "Cliente Portal",
        }),
      })
    );

    await waitFor(() => {
      expect(screen.getByText("Aprovado")).toBeInTheDocument();
    });

    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
  });

  it("usa URL encoded com headers explícitos e body mínimo", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        status: "approved",
        decidedAt: "2026-02-22T13:00:00.000Z",
        decidedBy: "Cliente Portal",
      }),
    });

    render(
      <DecisionForm
        token="tok en/+=?"
        changeOrderId="10/20"
        initialStatus="PENDING"
        decidedAt={null}
        decidedBy={null}
      />
    );

    fireEvent.change(screen.getByLabelText("Seu nome"), {
      target: { value: "Cliente Portal" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Aprovar" }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/portal/tok%20en%2F%2B%3D%3F/change-orders/10%2F20/decision",
      expect.objectContaining({
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          action: "APPROVE",
          name: "Cliente Portal",
        }),
      })
    );
  });

  it("ignora duplo clique em aprovar durante submit pendente", async () => {
    (global.fetch as jest.Mock).mockImplementation(
      () =>
        new Promise(() => {
          // intentionally pending
        })
    );

    render(
      <DecisionForm
        token="token-teste"
        changeOrderId="10"
        initialStatus="PENDING"
        decidedAt={null}
        decidedBy={null}
      />
    );

    fireEvent.change(screen.getByLabelText("Seu nome"), {
      target: { value: "Cliente Portal" },
    });

    const approveButton = screen.getByRole("button", { name: "Aprovar" });
    fireEvent.click(approveButton);
    fireEvent.click(approveButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  it("desabilita input e botões durante submit", async () => {
    let releaseRequest: (() => void) | null = null;
    (global.fetch as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) => {
          releaseRequest = () =>
            resolve({
              ok: true,
              json: async () => ({
                status: "approved",
                decidedAt: "2026-02-22T13:00:00.000Z",
                decidedBy: "Cliente Portal",
              }),
            });
        })
    );

    render(
      <DecisionForm
        token="token-teste"
        changeOrderId="10"
        initialStatus="PENDING"
        decidedAt={null}
        decidedBy={null}
      />
    );

    const input = screen.getByLabelText("Seu nome");
    fireEvent.change(input, {
      target: { value: "Cliente Portal" },
    });

    const approveButton = screen.getByRole("button", { name: "Aprovar" });
    const rejectButton = screen.getByRole("button", { name: "Rejeitar" });

    fireEvent.click(approveButton);

    await waitFor(() => {
      expect(input).toBeDisabled();
      expect(approveButton).toBeDisabled();
      expect(rejectButton).toBeDisabled();
      expect(screen.getAllByRole("button", { name: "Enviando…" })).toHaveLength(2);
    });

    releaseRequest!();

    await waitFor(() => {
      expect(screen.getByText("Aprovado")).toBeInTheDocument();
    });
  });

  it("trata 404 com mensagem neutra", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: "Not Found" }),
    });

    render(
      <DecisionForm
        token="token-teste"
        changeOrderId="11"
        initialStatus="PENDING"
        decidedAt={null}
        decidedBy={null}
      />
    );

    fireEvent.change(screen.getByLabelText("Seu nome"), {
      target: { value: "Cliente Portal" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Rejeitar" }));

    await waitFor(() => {
      expect(screen.getByText("Não foi possível concluir. Tente novamente.")).toBeInTheDocument();
    });

    expect(screen.getByRole("alert")).toHaveAttribute("aria-live", "assertive");
  });

  it("trata exception de fetch com mensagem neutra sem leak", async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error("stack interno sensível"));

    render(
      <DecisionForm
        token="token-teste"
        changeOrderId="11"
        initialStatus="PENDING"
        decidedAt={null}
        decidedBy={null}
      />
    );

    fireEvent.change(screen.getByLabelText("Seu nome"), {
      target: { value: "Cliente Portal" },
    });

    const approveButton = screen.getByRole("button", { name: "Aprovar" });

    fireEvent.click(approveButton);

    await waitFor(() => {
      expect(screen.getByText("Não foi possível concluir. Tente novamente.")).toBeInTheDocument();
    });

    expect(screen.queryByText("stack interno sensível")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(approveButton).toBeEnabled();
    });
  });

  it("normaliza nome com espaços extras no payload", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        status: "approved",
        decidedAt: "2026-02-22T13:00:00.000Z",
        decidedBy: "João Silva",
      }),
    });

    render(
      <DecisionForm
        token="token-teste"
        changeOrderId="10"
        initialStatus="PENDING"
        decidedAt={null}
        decidedBy={null}
      />
    );

    fireEvent.change(screen.getByLabelText("Seu nome"), {
      target: { value: "   João    Silva   " },
    });

    fireEvent.click(screen.getByRole("button", { name: "Aprovar" }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/portal/token-teste/change-orders/10/decision",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          action: "APPROVE",
          name: "João Silva",
        }),
      })
    );
  });

  it("rejeitar pede confirmação e não envia se cancelar", async () => {
    (window.confirm as jest.Mock).mockReturnValue(false);

    render(
      <DecisionForm
        token="token-teste"
        changeOrderId="10"
        initialStatus="PENDING"
        decidedAt={null}
        decidedBy={null}
      />
    );

    fireEvent.change(screen.getByLabelText("Seu nome"), {
      target: { value: "Cliente Portal" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Rejeitar" }));

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalledTimes(1);
    });

    expect(global.fetch).not.toHaveBeenCalled();
    expect(screen.queryByText("Rejeitado")).not.toBeInTheDocument();
  });

  it("rejeitar confirma e envia payload esperado", async () => {
    (window.confirm as jest.Mock).mockReturnValue(true);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        status: "rejected",
        decidedAt: "2026-02-22T13:00:00.000Z",
        decidedBy: "Cliente Portal",
      }),
    });

    render(
      <DecisionForm
        token="token-teste"
        changeOrderId="10"
        initialStatus="PENDING"
        decidedAt={null}
        decidedBy={null}
      />
    );

    fireEvent.change(screen.getByLabelText("Seu nome"), {
      target: { value: "Cliente Portal" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Rejeitar" }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/portal/token-teste/change-orders/10/decision",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          action: "REJECT",
          name: "Cliente Portal",
        }),
      })
    );

    await waitFor(() => {
      expect(screen.getByText("Rejeitado")).toBeInTheDocument();
    });

    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
  });

  it("quando já decidido não renderiza formulário", () => {
    render(
      <DecisionForm
        token="token-teste"
        changeOrderId="12"
        initialStatus="APPROVED"
        decidedAt="2026-02-22T13:00:00.000Z"
        decidedBy="Cliente Portal"
      />
    );

    expect(screen.queryByLabelText("Seu nome")).not.toBeInTheDocument();
    expect(screen.getByText("Aprovado")).toBeInTheDocument();
  });
});
