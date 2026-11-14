interface ModalAction {
  label: string;
  value: string;
  variant?: "primary" | "secondary";
}

interface ModalOptions {
  title: string;
  body: string;
  actions: ModalAction[];
}

function fallbackConfirm(title: string, body: string): boolean {
  return window.confirm(`${title}\n\n${body}`);
}

function fallbackAlert(title: string, body: string): void {
  window.alert(`${title}\n\n${body}`);
}

function buttonStyle(variant: ModalAction["variant"]): Partial<CSSStyleDeclaration> {
  if (variant === "primary") {
    return {
      background: "#d7e7ff",
      color: "#07111f",
      borderColor: "#d7e7ff",
    };
  }
  return {
    background: "#1b2028",
    color: "#e6e8ef",
    borderColor: "#3b4350",
  };
}

export function showModalDialog(options: ModalOptions): Promise<string> {
  if (typeof document === "undefined" || typeof HTMLDialogElement === "undefined") {
    return Promise.resolve(options.actions[0]?.value ?? "");
  }

  const dialog = document.createElement("dialog");
  dialog.style.width = "min(460px, calc(100vw - 32px))";
  dialog.style.border = "1px solid #3b4350";
  dialog.style.borderRadius = "8px";
  dialog.style.padding = "0";
  dialog.style.background = "#151922";
  dialog.style.color = "#e6e8ef";
  dialog.style.boxShadow = "0 24px 80px rgba(0, 0, 0, 0.55)";

  const title = document.createElement("div");
  title.textContent = options.title;
  title.style.fontSize = "15px";
  title.style.fontWeight = "600";
  title.style.padding = "16px 18px 8px";

  const body = document.createElement("div");
  body.textContent = options.body;
  body.style.whiteSpace = "pre-line";
  body.style.fontSize = "13px";
  body.style.lineHeight = "1.45";
  body.style.color = "#cbd2df";
  body.style.padding = "0 18px 16px";

  const footer = document.createElement("form");
  footer.method = "dialog";
  footer.style.display = "flex";
  footer.style.justifyContent = "flex-end";
  footer.style.gap = "8px";
  footer.style.padding = "12px 18px 16px";

  for (const action of options.actions) {
    const button = document.createElement("button");
    button.type = "submit";
    button.value = action.value;
    button.textContent = action.label;
    button.style.fontSize = "13px";
    button.style.padding = "7px 12px";
    button.style.border = "1px solid";
    button.style.borderRadius = "6px";
    button.style.cursor = "pointer";
    Object.assign(button.style, buttonStyle(action.variant));
    footer.append(button);
  }

  dialog.append(title, body, footer);
  document.body.append(dialog);

  return new Promise((resolve) => {
  dialog.addEventListener("close", () => {
      const value = dialog.returnValue || options.actions[0]?.value || "";
      dialog.remove();
      resolve(value);
    }, { once: true });
    if (typeof dialog.showModal !== "function") {
      dialog.remove();
      resolve(options.actions[0]?.value ?? "");
      return;
    }
    dialog.showModal();
  });
}

export async function showModalConfirm(options: {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
}): Promise<boolean> {
  if (typeof window === "undefined") return true;
  if (typeof document === "undefined" || typeof HTMLDialogElement === "undefined") {
    return fallbackConfirm(options.title, options.body);
  }
  const value = await showModalDialog({
    title: options.title,
    body: options.body,
    actions: [
      { label: options.cancelLabel, value: "cancel", variant: "secondary" },
      { label: options.confirmLabel, value: "confirm", variant: "primary" },
    ],
  });
  return value === "confirm";
}

export async function showModalAlert(options: {
  title: string;
  body: string;
  buttonLabel?: string;
}): Promise<void> {
  if (typeof window === "undefined") return;
  if (typeof document === "undefined" || typeof HTMLDialogElement === "undefined") {
    fallbackAlert(options.title, options.body);
    return;
  }
  await showModalDialog({
    title: options.title,
    body: options.body,
    actions: [
      { label: options.buttonLabel ?? "OK", value: "ok", variant: "primary" },
    ],
  });
}
