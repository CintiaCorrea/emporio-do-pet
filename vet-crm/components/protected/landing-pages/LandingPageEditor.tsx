'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import grapesjs, { Editor } from 'grapesjs';
import GjsEditor from '@grapesjs/react';
import blocksBasic from 'grapesjs-blocks-basic';
import presetWebpage from 'grapesjs-preset-webpage';
import petBlocksPlugin from '@/lib/landing-pages/grapesjs-pet-blocks';
import EditorToolbar from './EditorToolbar';
import { downloadElementorJson } from '@/lib/landing-pages/download-elementor';
import { toast } from 'sonner';

interface LandingPageData {
  id: string;
  name: string;
  slug: string;
  content: any;
  styles: any;
  settings: any;
}

interface LandingPageEditorProps {
  pageData: LandingPageData;
}

export default function LandingPageEditor({ pageData }: LandingPageEditorProps) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSave = useCallback(async () => {
    if (!editor) return;

    setIsSaving(true);
    try {
      const projectData = editor.getProjectData();
      const css = editor.getCss();
      const html = editor.getHtml();

      const content = {
        ...projectData,
        _html: html,
        _css: css,
      };

      const styles = projectData.styles || [];

      const res = await fetch(`/api/landing-pages/${pageData.id}/content`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, styles }),
      });

      if (!res.ok) throw new Error('Falha ao salvar');
      toast.success('Salvo com sucesso');
    } catch {
      toast.error('Erro ao salvar a landing page');
    } finally {
      setIsSaving(false);
    }
  }, [editor, pageData.id]);

  const handleAutoSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      handleSave();
    }, 5000);
  }, [handleSave]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const handleExport = useCallback(async () => {
    try {
      if (editor) {
        await handleSave();
      }
      await downloadElementorJson(pageData.id, pageData.slug);
      toast.success('JSON Elementor exportado com sucesso');
    } catch {
      toast.error('Erro ao exportar para Elementor');
    }
  }, [editor, pageData.id, pageData.slug, handleSave]);

  const onEditor = useCallback(
    (editorInstance: Editor) => {
      setEditor(editorInstance);

      const content = pageData.content;
      if (content && typeof content === 'object' && Object.keys(content).length > 0) {
        const { _html, _css, ...projectData } = content;
        if (projectData.pages || projectData.assets || projectData.styles) {
          editorInstance.loadProjectData(projectData);
        } else if (_html) {
          editorInstance.setComponents(_html);
          if (_css) {
            editorInstance.setStyle(_css);
          }
        }
      }

      editorInstance.on('change:changesCount', () => {
        handleAutoSave();
      });
    },
    [pageData.content, handleAutoSave],
  );

  return (
    <div className="h-screen flex flex-col bg-slate-900">
      <EditorToolbar
        editor={editor}
        pageName={pageData.name}
        pageSlug={pageData.slug}
        pageId={pageData.id}
        isSaving={isSaving}
        onSave={handleSave}
        onExport={handleExport}
      />
      <div className="flex-1 overflow-hidden">
        <GjsEditor
          grapesjs={grapesjs}
          grapesjsCss="https://unpkg.com/grapesjs/dist/css/grapes.min.css"
          options={{
            height: '100%',
            storageManager: false,
            plugins: [
              (e) => blocksBasic(e, { flexGrid: true, addBasicStyle: true }),
              (e) => presetWebpage(e, { showStylesOnChange: true }),
              petBlocksPlugin,
            ],
            deviceManager: {
              devices: [
                { name: 'Desktop', width: '' },
                { name: 'Tablet', width: '768px', widthMedia: '992px' },
                { name: 'Mobile portrait', width: '320px', widthMedia: '480px' },
              ],
            },
            canvas: {
              styles: [
                'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap',
              ],
            },
          }}
          onEditor={onEditor}
        />
      </div>
    </div>
  );
}
