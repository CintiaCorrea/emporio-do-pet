import { Injectable } from '@nestjs/common';

interface GrapesJSComponent {
  type?: string;
  tagName?: string;
  content?: string;
  classes?: Array<{ name: string }> | string[];
  attributes?: Record<string, string>;
  components?: GrapesJSComponent[];
  style?: Record<string, string>;
}

interface ElementorElement {
  id: string;
  elType: 'container' | 'widget';
  widgetType?: string;
  isInner: boolean;
  settings: Record<string, unknown> | unknown[];
  elements: ElementorElement[];
}

export interface ElementorTemplate {
  title: string;
  type: string;
  version: string;
  page_settings: Record<string, unknown> | unknown[];
  content: ElementorElement[];
}

@Injectable()
export class ElementorExporterService {
  private generateId(): string {
    return Math.random().toString(16).substring(2, 10);
  }

  export(
    name: string,
    content: any,
    styles: any,
    settings: any,
  ): ElementorTemplate {
    const styleMap = this.buildStyleMap(styles);
    const components: GrapesJSComponent[] = Array.isArray(content)
      ? content
      : content?.components || content?.pages?.[0]?.frames?.[0]?.component?.components || [];

    const elementorContent = this.convertComponents(components, styleMap, false);

    const pageSettings: Record<string, unknown> = {};
    if (settings?.seoTitle) {
      pageSettings['post_title'] = settings.seoTitle;
    }
    if (settings?.backgroundColor) {
      pageSettings['background_background'] = 'classic';
      pageSettings['background_color'] = settings.backgroundColor;
    }

    return {
      title: name,
      type: 'page',
      version: '0.4',
      page_settings: Object.keys(pageSettings).length ? pageSettings : [],
      content: elementorContent.length
        ? elementorContent
        : [
            {
              id: this.generateId(),
              elType: 'container',
              isInner: false,
              settings: [],
              elements: [],
            },
          ],
    };
  }

  private buildStyleMap(styles: any): Map<string, Record<string, string>> {
    const map = new Map<string, Record<string, string>>();
    if (!styles) return map;

    const stylesArray = Array.isArray(styles) ? styles : [];
    for (const rule of stylesArray) {
      const selectors = rule.selectors || [];
      const style = rule.style || {};
      for (const selector of selectors) {
        const name = typeof selector === 'string' ? selector : selector?.name;
        if (name && Object.keys(style).length > 0) {
          map.set(name, { ...(map.get(name) || {}), ...style });
        }
      }
    }
    return map;
  }

  private getStylesForComponent(
    component: GrapesJSComponent,
    styleMap: Map<string, Record<string, string>>,
  ): Record<string, string> {
    let merged: Record<string, string> = {};
    const classes = component.classes || [];
    for (const cls of classes) {
      const name = typeof cls === 'string' ? cls : cls?.name;
      if (name && styleMap.has(name)) {
        merged = { ...merged, ...styleMap.get(name) };
      }
    }
    if (component.style) {
      merged = { ...merged, ...component.style };
    }
    return merged;
  }

  private convertComponents(
    components: GrapesJSComponent[],
    styleMap: Map<string, Record<string, string>>,
    isInner: boolean,
  ): ElementorElement[] {
    const elements: ElementorElement[] = [];

    for (const comp of components) {
      const element = this.convertComponent(comp, styleMap, isInner);
      if (element) {
        elements.push(element);
      }
    }

    return elements;
  }

  private convertComponent(
    comp: GrapesJSComponent,
    styleMap: Map<string, Record<string, string>>,
    isInner: boolean,
  ): ElementorElement | null {
    const tag = (comp.tagName || comp.type || '').toLowerCase();
    const css = this.getStylesForComponent(comp, styleMap);
    const children = comp.components || [];

    if (this.isHeadingTag(tag)) {
      return this.createHeadingWidget(comp, css, tag);
    }
    if (tag === 'img' || comp.type === 'image') {
      return this.createImageWidget(comp, css);
    }
    if (tag === 'a' || tag === 'button' || comp.type === 'link') {
      if (this.isButtonLike(comp)) {
        return this.createButtonWidget(comp, css);
      }
    }
    if (tag === 'video' || comp.type === 'video') {
      return this.createVideoWidget(comp, css);
    }
    if (tag === 'form') {
      return this.createFormWidget(comp, css);
    }
    if (tag === 'hr') {
      return this.createDividerWidget(css);
    }
    if (tag === 'iframe' || comp.type === 'map') {
      return this.createMapWidget(comp, css);
    }

    const textContent = this.extractTextContent(comp);
    if (
      textContent &&
      children.length === 0 &&
      !this.isLayoutTag(tag)
    ) {
      return this.createTextWidget(textContent, css);
    }

    if (children.length > 0 || this.isLayoutTag(tag)) {
      return this.createContainer(comp, children, styleMap, isInner, css);
    }

    if (textContent) {
      return this.createTextWidget(textContent, css);
    }

    return null;
  }

  private isHeadingTag(tag: string): boolean {
    return /^h[1-6]$/.test(tag);
  }

  private isLayoutTag(tag: string): boolean {
    return ['div', 'section', 'article', 'main', 'header', 'footer', 'nav', 'aside', ''].includes(tag);
  }

  private isButtonLike(comp: GrapesJSComponent): boolean {
    if (comp.tagName?.toLowerCase() === 'button') return true;
    const classes = (comp.classes || []).map((c) =>
      typeof c === 'string' ? c : c?.name || '',
    );
    return classes.some(
      (c) =>
        c.includes('btn') || c.includes('button') || c.includes('cta'),
    );
  }

  private extractTextContent(comp: GrapesJSComponent): string {
    if (comp.content) return comp.content;
    if (comp.type === 'textnode' && comp.content) return comp.content;
    if (!comp.components || comp.components.length === 0) return '';

    const textParts: string[] = [];
    for (const child of comp.components) {
      if (child.type === 'textnode' && child.content) {
        textParts.push(child.content);
      }
    }
    return textParts.join('');
  }

  private createHeadingWidget(
    comp: GrapesJSComponent,
    css: Record<string, string>,
    tag: string,
  ): ElementorElement {
    const title = this.extractTextContent(comp) || 'Heading';
    const settings: Record<string, unknown> = {
      title,
      header_size: tag,
    };
    this.applyTextStyles(settings, css);
    this.applySpacingStyles(settings, css);

    return {
      id: this.generateId(),
      elType: 'widget',
      widgetType: 'heading',
      isInner: false,
      settings,
      elements: [],
    };
  }

  private createTextWidget(
    text: string,
    css: Record<string, string>,
  ): ElementorElement {
    const settings: Record<string, unknown> = {
      editor: text,
    };
    this.applyTextStyles(settings, css);
    this.applySpacingStyles(settings, css);

    return {
      id: this.generateId(),
      elType: 'widget',
      widgetType: 'text-editor',
      isInner: false,
      settings,
      elements: [],
    };
  }

  private createImageWidget(
    comp: GrapesJSComponent,
    css: Record<string, string>,
  ): ElementorElement {
    const settings: Record<string, unknown> = {
      image: {
        url: comp.attributes?.src || '',
        alt: comp.attributes?.alt || '',
      },
    };

    if (css['width']) {
      settings['image_size'] = 'custom';
      settings['width'] = this.parseSizeValue(css['width']);
    }
    this.applySpacingStyles(settings, css);

    return {
      id: this.generateId(),
      elType: 'widget',
      widgetType: 'image',
      isInner: false,
      settings,
      elements: [],
    };
  }

  private createButtonWidget(
    comp: GrapesJSComponent,
    css: Record<string, string>,
  ): ElementorElement {
    const text = this.extractTextContent(comp) || 'Click';
    const settings: Record<string, unknown> = {
      text,
      link: { url: comp.attributes?.href || '#', is_external: false },
    };

    if (css['background-color']) {
      settings['background_color'] = css['background-color'];
    }
    if (css['color']) {
      settings['button_text_color'] = css['color'];
    }
    if (css['border-radius']) {
      settings['border_radius'] = this.parseBoxValue(css['border-radius']);
    }
    this.applySpacingStyles(settings, css);

    return {
      id: this.generateId(),
      elType: 'widget',
      widgetType: 'button',
      isInner: false,
      settings,
      elements: [],
    };
  }

  private createVideoWidget(
    comp: GrapesJSComponent,
    css: Record<string, string>,
  ): ElementorElement {
    const src = comp.attributes?.src || '';
    const settings: Record<string, unknown> = {
      video_type: 'hosted',
      hosted_url: { url: src },
    };
    this.applySpacingStyles(settings, css);

    return {
      id: this.generateId(),
      elType: 'widget',
      widgetType: 'video',
      isInner: false,
      settings,
      elements: [],
    };
  }

  private createFormWidget(
    comp: GrapesJSComponent,
    css: Record<string, string>,
  ): ElementorElement {
    const settings: Record<string, unknown> = {
      form_name: 'Contato',
      form_fields: [
        { field_type: 'text', field_label: 'Nome', placeholder: 'Seu nome', required: 'true', field_id: 'name' },
        { field_type: 'email', field_label: 'Email', placeholder: 'Seu email', required: 'true', field_id: 'email' },
        { field_type: 'tel', field_label: 'Telefone', placeholder: 'Seu telefone', field_id: 'phone' },
        { field_type: 'textarea', field_label: 'Mensagem', placeholder: 'Sua mensagem', field_id: 'message' },
      ],
      button_text: 'Enviar',
    };
    this.applySpacingStyles(settings, css);

    return {
      id: this.generateId(),
      elType: 'widget',
      widgetType: 'form',
      isInner: false,
      settings,
      elements: [],
    };
  }

  private createDividerWidget(css: Record<string, string>): ElementorElement {
    const settings: Record<string, unknown> = {};
    if (css['border-color']) {
      settings['color'] = css['border-color'];
    }
    this.applySpacingStyles(settings, css);

    return {
      id: this.generateId(),
      elType: 'widget',
      widgetType: 'divider',
      isInner: false,
      settings,
      elements: [],
    };
  }

  private createMapWidget(
    comp: GrapesJSComponent,
    css: Record<string, string>,
  ): ElementorElement {
    const settings: Record<string, unknown> = {
      address: comp.attributes?.['data-address'] || '',
    };
    this.applySpacingStyles(settings, css);

    return {
      id: this.generateId(),
      elType: 'widget',
      widgetType: 'google_maps',
      isInner: false,
      settings,
      elements: [],
    };
  }

  private createContainer(
    comp: GrapesJSComponent,
    children: GrapesJSComponent[],
    styleMap: Map<string, Record<string, string>>,
    isInner: boolean,
    css: Record<string, string>,
  ): ElementorElement {
    const settings: Record<string, unknown> = {};

    if (css['background-color']) {
      settings['background_background'] = 'classic';
      settings['background_color'] = css['background-color'];
    }
    if (css['background-image']) {
      settings['background_background'] = 'classic';
      settings['background_image'] = { url: css['background-image'].replace(/url\(['"]?|['"]?\)/g, '') };
    }
    if (css['min-height']) {
      settings['height'] = 'min-height';
      settings['custom_height'] = this.parseSizeValue(css['min-height']);
    }
    if (css['display'] === 'flex') {
      if (css['flex-direction'] === 'row') {
        settings['flex_direction'] = 'row';
      }
      if (css['justify-content']) {
        settings['justify_content'] = css['justify-content'];
      }
      if (css['align-items']) {
        settings['align_items'] = css['align-items'];
      }
      if (css['gap']) {
        settings['flex_gap'] = this.parseSizeValue(css['gap']);
      }
    }
    const tag = (comp.tagName || '').toLowerCase();
    if (tag && tag !== 'div') {
      settings['html_tag'] = tag;
    }
    this.applySpacingStyles(settings, css);

    return {
      id: this.generateId(),
      elType: 'container',
      isInner,
      settings: Object.keys(settings).length > 0 ? settings : [],
      elements: this.convertComponents(children, styleMap, true),
    };
  }

  private applyTextStyles(
    settings: Record<string, unknown>,
    css: Record<string, string>,
  ): void {
    if (css['text-align']) {
      settings['align'] = css['text-align'];
    }
    if (css['color']) {
      settings['title_color'] = css['color'];
    }
    if (css['font-size']) {
      settings['typography_font_size'] = this.parseSizeValue(css['font-size']);
    }
    if (css['font-family']) {
      settings['typography_font_family'] = css['font-family'].replace(/['"]/g, '');
    }
    if (css['font-weight']) {
      settings['typography_font_weight'] = css['font-weight'];
    }
    if (css['line-height']) {
      settings['typography_line_height'] = this.parseSizeValue(css['line-height']);
    }
    if (css['letter-spacing']) {
      settings['typography_letter_spacing'] = this.parseSizeValue(css['letter-spacing']);
    }
  }

  private applySpacingStyles(
    settings: Record<string, unknown>,
    css: Record<string, string>,
  ): void {
    if (css['padding']) {
      settings['padding'] = this.parseBoxValue(css['padding']);
    }
    if (css['margin']) {
      settings['margin'] = this.parseBoxValue(css['margin']);
    }
    ['padding-top', 'padding-right', 'padding-bottom', 'padding-left'].forEach((prop) => {
      if (css[prop] && !css['padding']) {
        if (!settings['padding']) {
          settings['padding'] = { unit: 'px', top: '0', right: '0', bottom: '0', left: '0', isLinked: false };
        }
        const side = prop.split('-')[1];
        (settings['padding'] as Record<string, unknown>)[side] = parseInt(css[prop], 10).toString();
      }
    });
    ['margin-top', 'margin-right', 'margin-bottom', 'margin-left'].forEach((prop) => {
      if (css[prop] && !css['margin']) {
        if (!settings['margin']) {
          settings['margin'] = { unit: 'px', top: '0', right: '0', bottom: '0', left: '0', isLinked: false };
        }
        const side = prop.split('-')[1];
        (settings['margin'] as Record<string, unknown>)[side] = parseInt(css[prop], 10).toString();
      }
    });
  }

  private parseSizeValue(value: string): { size: number; unit: string; sizes?: unknown[] } {
    const match = value.match(/^([\d.]+)\s*(px|em|rem|%|vh|vw)?$/);
    if (match) {
      return { size: parseFloat(match[1]), unit: match[2] || 'px', sizes: [] };
    }
    return { size: 0, unit: 'px', sizes: [] };
  }

  private parseBoxValue(value: string): Record<string, unknown> {
    const parts = value.split(/\s+/).map((p) => parseInt(p, 10).toString());
    if (parts.length === 1) {
      return { unit: 'px', top: parts[0], right: parts[0], bottom: parts[0], left: parts[0], isLinked: true };
    }
    if (parts.length === 2) {
      return { unit: 'px', top: parts[0], right: parts[1], bottom: parts[0], left: parts[1], isLinked: false };
    }
    if (parts.length === 4) {
      return { unit: 'px', top: parts[0], right: parts[1], bottom: parts[2], left: parts[3], isLinked: false };
    }
    return { unit: 'px', top: '0', right: '0', bottom: '0', left: '0', isLinked: true };
  }
}
