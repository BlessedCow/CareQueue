import { useCallback, useState } from "react";

import { previewPdfIntake, type PdfIntakePreview } from "../api/pdfIntake";

interface PdfIntakePreviewState {
  selectedFile: File | null;
  preview: PdfIntakePreview | null;
  isLoading: boolean;
  error: string | null;
}

const INITIAL_PDF_INTAKE_STATE: PdfIntakePreviewState = {
  selectedFile: null,
  preview: null,
  isLoading: false,
  error: null,
};

export function usePdfIntakePreview() {
  const [state, setState] = useState<PdfIntakePreviewState>(
    INITIAL_PDF_INTAKE_STATE
  );

  const clearPdfIntake = useCallback(() => {
    setState(INITIAL_PDF_INTAKE_STATE);
  }, []);

  const selectPdf = useCallback((file: File | null) => {
    setState({
      selectedFile: file,
      preview: null,
      isLoading: false,
      error: null,
    });
  }, []);

  const requestPreview = useCallback(async () => {
    if (!state.selectedFile) {
      setState((currentState) => ({
        ...currentState,
        error: "Select a PDF before requesting a preview.",
      }));
      return;
    }

    setState((currentState) => ({
      ...currentState,
      preview: null,
      isLoading: true,
      error: null,
    }));

    try {
      const preview = await previewPdfIntake(state.selectedFile);

      setState((currentState) => ({
        ...currentState,
        selectedFile: null,
        preview,
        isLoading: false,
        error: null,
      }));
    } catch (error) {
      setState((currentState) => ({
        ...currentState,
        preview: null,
        isLoading: false,
        error:
          error instanceof Error
            ? error.message
            : "The PDF could not be processed.",
      }));
    }
  }, [state.selectedFile]);

  return {
    selectedPdfFile: state.selectedFile,
    pdfIntakePreview: state.preview,
    isLoadingPdfPreview: state.isLoading,
    pdfIntakeError: state.error,
    selectPdf,
    requestPreview,
    clearPdfIntake,
  };
}
