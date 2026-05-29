'use client';

import { useState, useRef } from 'react';
import { 
  LuDownload, 
  LuUpload, 
  LuX, 
  LuLoader,
  LuFileJson,
  LuCheck,
  LuCircleAlert
} from 'react-icons/lu';
import { toast } from 'sonner';

interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

interface TemplateImportExportProps {
  selectedTemplateIds?: string[];
  onImportComplete?: () => void;
}

export default function TemplateImportExport({ 
  selectedTemplateIds = [],
  onImportComplete 
}: TemplateImportExportProps) {
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [jsonPreview, setJsonPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await fetch('/api/templates/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          templateIds: selectedTemplateIds.length > 0 ? selectedTemplateIds : undefined 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao exportar templates');
      }

      // Criar arquivo e fazer download
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `templates-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`${data.count} template(s) exportado(s) com sucesso!`);
    } catch (error) {
      console.error('Erro ao exportar:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao exportar templates');
    } finally {
      setExporting(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const json = JSON.parse(content);
        
        // Validar estrutura
        if (!json.templates && !json.template) {
          throw new Error('Formato inválido: arquivo deve conter "templates" ou "template"');
        }

        setJsonPreview(content);
        setIsImportModalOpen(true);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Erro ao ler arquivo JSON');
      }
    };
    reader.readAsText(file);
    
    // Reset input para permitir selecionar o mesmo arquivo novamente
    e.target.value = '';
  };

  const handleImport = async () => {
    if (!jsonPreview) return;

    setImporting(true);
    setImportResult(null);

    try {
      const json = JSON.parse(jsonPreview);
      
      // Normalizar para array de templates
      const templates = json.templates || [json.template];

      const response = await fetch('/api/templates/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templates }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao importar templates');
      }

      setImportResult(data);

      if (data.imported > 0) {
        toast.success(`${data.imported} template(s) importado(s) com sucesso!`);
        onImportComplete?.();
      } else if (data.skipped > 0) {
        toast.warning('Nenhum template foi importado (todos já existiam)');
      }
    } catch (error) {
      console.error('Erro ao importar:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao importar templates');
    } finally {
      setImporting(false);
    }
  };

  const closeModal = () => {
    setIsImportModalOpen(false);
    setJsonPreview(null);
    setImportResult(null);
  };

  const getTemplateCount = () => {
    if (!jsonPreview) return 0;
    try {
      const json = JSON.parse(jsonPreview);
      return json.templates?.length || (json.template ? 1 : 0);
    } catch {
      return 0;
    }
  };

  return (
    <>
      {/* Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl font-medium transition-colors disabled:opacity-50"
        >
          {exporting ? (
            <LuLoader className="w-4 h-4 animate-spin" />
          ) : (
            <LuDownload className="w-4 h-4" />
          )}
          Exportar
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl font-medium transition-colors"
        >
          <LuUpload className="w-4 h-4" />
          Importar
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 rounded-xl">
                    <LuFileJson className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Importar Templates</h2>
                    <p className="text-sm text-gray-500">{getTemplateCount()} template(s) encontrado(s)</p>
                  </div>
                </div>
                <button
                  onClick={closeModal}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <LuX className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {!importResult ? (
                <>
                  {/* Preview */}
                  <div className="bg-gray-50 rounded-xl p-4 max-h-60 overflow-y-auto">
                    <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                      {jsonPreview && JSON.stringify(JSON.parse(jsonPreview), null, 2).slice(0, 1000)}
                      {jsonPreview && jsonPreview.length > 1000 && '...'}
                    </pre>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={closeModal}
                      disabled={importing}
                      className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleImport}
                      disabled={importing}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-all disabled:opacity-50"
                    >
                      {importing ? (
                        <>
                          <LuLoader className="w-5 h-5 animate-spin" />
                          Importando...
                        </>
                      ) : (
                        <>
                          <LuUpload className="w-5 h-5" />
                          Importar
                        </>
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Results */}
                  <div className="space-y-3">
                    {importResult.imported > 0 && (
                      <div className="flex items-center gap-3 p-3 bg-cyan-50 rounded-xl">
                        <LuCheck className="w-5 h-5 text-cyan-600" />
                        <span className="text-cyan-700">
                          {importResult.imported} template(s) importado(s)
                        </span>
                      </div>
                    )}

                    {importResult.skipped > 0 && (
                      <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-xl">
                        <LuCircleAlert className="w-5 h-5 text-orange-600" />
                        <span className="text-orange-700">
                          {importResult.skipped} template(s) pulado(s) (já existiam)
                        </span>
                      </div>
                    )}

                    {importResult.errors.length > 0 && (
                      <div className="p-3 bg-red-50 rounded-xl">
                        <p className="text-red-700 font-medium mb-2">Erros:</p>
                        <ul className="text-sm text-red-600 space-y-1">
                          {importResult.errors.map((error, i) => (
                            <li key={i}>• {error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={closeModal}
                    className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
                  >
                    Fechar
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
