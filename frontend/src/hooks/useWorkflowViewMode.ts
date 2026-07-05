import { useEffect, useState } from "react";

export type WorkflowViewMode = "relaxed" | "detailed";

const WORKFLOW_VIEW_MODE_STORAGE_KEY = "carequeue.workflowViewMode";

function loadWorkflowViewMode(): WorkflowViewMode {
  try {
    const storedValue = window.localStorage.getItem(
      WORKFLOW_VIEW_MODE_STORAGE_KEY
    );

    if (storedValue === "detailed" || storedValue === "relaxed") {
      return storedValue;
    }

    return "relaxed";
  } catch {
    return "relaxed";
  }
}

export function useWorkflowViewMode() {
  const [workflowViewMode, setWorkflowViewMode] =
    useState<WorkflowViewMode>(loadWorkflowViewMode);

  useEffect(() => {
    window.localStorage.setItem(
      WORKFLOW_VIEW_MODE_STORAGE_KEY,
      workflowViewMode
    );
  }, [workflowViewMode]);

  return {
    workflowViewMode,
    setWorkflowViewMode,
  };
}
