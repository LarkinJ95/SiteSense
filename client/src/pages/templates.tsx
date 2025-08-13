import { TemplateManager } from "@/components/template-manager";

export default function Templates() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="templates-title">Survey Templates</h1>
        <p className="text-gray-600 mt-2">
          Create and manage reusable survey templates with pre-configured checklists and settings.
        </p>
      </div>
      
      <TemplateManager />
    </div>
  );
}