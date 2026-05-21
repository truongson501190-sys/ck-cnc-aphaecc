MVP Todo List - Production Management System
Overview
Combining two code pieces to create a complete production management system with authentication, routing, and production reporting functionality.

Files to Create (8 files max):
src/App.tsx - Main app with routing and authentication (from provided code)
src/contexts/AuthContext.tsx - Authentication context provider
src/components/ProtectedRoute.tsx - Route protection component
src/components/Header.tsx - Application header with user management
src/components/Sidebar.tsx - Navigation sidebar
src/pages/LoginPage.tsx - Login page component
src/pages/UserManagement.tsx - User management page
src/components/ProductionForm.tsx - Production form component (from provided code)
Key Features:
User authentication system
Protected routes with role-based access
Production report form with tool management
Auto-fill customer data based on project selection
Time tracking and cost management
Responsive design with shadcn-ui components
Implementation Strategy:
Use localStorage for data persistence (users, customers, tools, machines)
Simple authentication without backend
Role-based access control (admin, manager, user)
Vietnamese language interface
Mobile-responsive design