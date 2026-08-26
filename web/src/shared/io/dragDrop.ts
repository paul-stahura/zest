/**
 * Attaches drag-and-drop listeners that forward the first dropped file to a handler.
 */
export function attachDropFileHandler(
  element: HTMLElement,
  onFile: (file: File) => void,
): () => void {
  const prevent = (event: DragEvent): void => {
    event.preventDefault();
    event.stopPropagation();
  };

  const onDragOver = (event: DragEvent): void => {
    prevent(event);
    if (event.dataTransfer !== null) {
      event.dataTransfer.dropEffect = "copy";
    }
  };

  const onDrop = (event: DragEvent): void => {
    prevent(event);
    const file = event.dataTransfer?.files.item(0);
    if (file !== null && file !== undefined) {
      onFile(file);
    }
  };

  element.addEventListener("dragenter", prevent);
  element.addEventListener("dragover", onDragOver);
  element.addEventListener("dragleave", prevent);
  element.addEventListener("drop", onDrop);

  return () => {
    element.removeEventListener("dragenter", prevent);
    element.removeEventListener("dragover", onDragOver);
    element.removeEventListener("dragleave", prevent);
    element.removeEventListener("drop", onDrop);
  };
}
