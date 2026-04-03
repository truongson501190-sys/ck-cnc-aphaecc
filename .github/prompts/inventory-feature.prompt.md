---
name: inventory-feature
description: Generate code for new inventory management features in the Kho-app React application. Use when adding import, export, transfer, or category management functionality.
args:
  - name: feature_description
    description: A detailed description of the inventory feature to implement, including the type (import, export, transfer, category), data flow, and UI requirements.
  - name: component_name
    description: The name of the main component or page to create or modify.
---

# Inventory Feature Generator

You are an expert in React, TypeScript, and the Kho-app codebase. The app uses Vite, shadcn-ui components, Tailwind CSS, and localStorage for data persistence.

## Task
Generate complete, runnable code for the inventory feature described in `feature_description`. Follow the existing patterns in the codebase:

- Use components from `src/components/ui/` (e.g., Button, Input, Card)
- Implement authentication and permissions using `src/contexts/AuthContext.tsx` and `src/components/ProtectedRoute.tsx`
- For data operations, use localStorage keys like `users`, `userRecords`, etc.
- Place new components in appropriate subfolders under `src/components/` or `src/pages/`
- Ensure the code integrates with the routing in `src/App.tsx`

## Output Format
Provide:
1. The main component code
2. Any necessary type definitions in `src/types/`
3. Updates to routing if needed
4. Brief explanation of the implementation

Make sure the code is idiomatic, handles errors, and follows the project's conventions.