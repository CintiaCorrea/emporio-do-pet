import type { Editor } from 'grapesjs';

export default function petBlocksPlugin(editor: Editor) {
  const blockManager = editor.Blocks;
  const category = 'Pet Shop';

  blockManager.add('pet-hero', {
    label: 'Hero Section',
    category,
    media: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="20" height="18" rx="2"/><line x1="2" y1="9" x2="22" y2="9"/></svg>',
    content: `<section style="background: linear-gradient(135deg, #0f172a 0%, #164e63 100%); padding: 80px 20px; text-align: center; min-height: 70vh; display: flex; align-items: center; justify-content: center;">
      <div style="max-width: 800px; margin: 0 auto;">
        <h1 style="font-size: 48px; font-weight: 800; color: #ffffff; margin-bottom: 16px;">Título Principal</h1>
        <p style="font-size: 20px; color: #94a3b8; margin-bottom: 32px; line-height: 1.6;">Descrição curta sobre seu negócio pet. Explique o que faz de especial.</p>
        <a href="#contato" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #06b6d4, #14b8a6); color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 18px;">Chamar Ação</a>
      </div>
    </section>`,
  });

  blockManager.add('pet-services', {
    label: 'Grid Serviços',
    category,
    media: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="8" height="8" rx="1"/><rect x="14" y="2" width="8" height="8" rx="1"/><rect x="2" y="14" width="8" height="8" rx="1"/><rect x="14" y="14" width="8" height="8" rx="1"/></svg>',
    content: `<section style="padding: 80px 20px; background: #f8fafc;">
      <div style="max-width: 1000px; margin: 0 auto; text-align: center;">
        <h2 style="font-size: 36px; font-weight: 700; color: #0f172a; margin-bottom: 48px;">Nossos Serviços</h2>
        <div style="display: flex; gap: 24px; flex-wrap: wrap; justify-content: center;">
          <div style="flex: 1; min-width: 250px; max-width: 300px; padding: 32px; background: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.06); text-align: center;">
            <div style="width: 64px; height: 64px; background: #ecfeff; border-radius: 16px; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; font-size: 28px;">🩺</div>
            <h3 style="font-size: 20px; font-weight: 600; color: #0f172a; margin-bottom: 8px;">Serviço 1</h3>
            <p style="color: #64748b; font-size: 14px; line-height: 1.6;">Descrição breve do serviço oferecido.</p>
          </div>
          <div style="flex: 1; min-width: 250px; max-width: 300px; padding: 32px; background: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.06); text-align: center;">
            <div style="width: 64px; height: 64px; background: #ecfeff; border-radius: 16px; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; font-size: 28px;">💉</div>
            <h3 style="font-size: 20px; font-weight: 600; color: #0f172a; margin-bottom: 8px;">Serviço 2</h3>
            <p style="color: #64748b; font-size: 14px; line-height: 1.6;">Descrição breve do serviço oferecido.</p>
          </div>
          <div style="flex: 1; min-width: 250px; max-width: 300px; padding: 32px; background: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.06); text-align: center;">
            <div style="width: 64px; height: 64px; background: #ecfeff; border-radius: 16px; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; font-size: 28px;">🔬</div>
            <h3 style="font-size: 20px; font-weight: 600; color: #0f172a; margin-bottom: 8px;">Serviço 3</h3>
            <p style="color: #64748b; font-size: 14px; line-height: 1.6;">Descrição breve do serviço oferecido.</p>
          </div>
        </div>
      </div>
    </section>`,
  });

  blockManager.add('pet-testimonials', {
    label: 'Depoimentos',
    category,
    media: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>',
    content: `<section style="padding: 80px 20px; background: #ffffff;">
      <div style="max-width: 800px; margin: 0 auto; text-align: center;">
        <h2 style="font-size: 36px; font-weight: 700; color: #0f172a; margin-bottom: 48px;">O que dizem nossos clientes</h2>
        <div style="display: flex; gap: 24px; flex-wrap: wrap; justify-content: center;">
          <div style="flex: 1; min-width: 300px; padding: 24px; background: #f8fafc; border-radius: 16px; border-left: 4px solid #06b6d4;">
            <p style="color: #334155; font-style: italic; margin-bottom: 12px; line-height: 1.6;">"Atendimento excepcional! Recomendo de olhos fechados."</p>
            <p style="color: #06b6d4; font-weight: 600; font-size: 14px;">— Maria Silva, tutora do Rex</p>
          </div>
          <div style="flex: 1; min-width: 300px; padding: 24px; background: #f8fafc; border-radius: 16px; border-left: 4px solid #06b6d4;">
            <p style="color: #334155; font-style: italic; margin-bottom: 12px; line-height: 1.6;">"Profissionais dedicados e carinhosos. Meu pet adora ir lá!"</p>
            <p style="color: #06b6d4; font-weight: 600; font-size: 14px;">— João Costa, tutor da Luna</p>
          </div>
        </div>
      </div>
    </section>`,
  });

  blockManager.add('pet-contact-form', {
    label: 'Formulário',
    category,
    media: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="7" y1="8" x2="17" y2="8"/><line x1="7" y1="12" x2="17" y2="12"/><line x1="7" y1="16" x2="13" y2="16"/></svg>',
    content: `<section style="padding: 80px 20px; background: #f8fafc;">
      <div style="max-width: 500px; margin: 0 auto;">
        <h2 style="font-size: 36px; font-weight: 700; color: #0f172a; margin-bottom: 32px; text-align: center;">Entre em Contato</h2>
        <form style="display: flex; flex-direction: column; gap: 16px;">
          <input type="text" placeholder="Seu nome" style="padding: 14px 16px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 15px; background: #ffffff; outline: none;" />
          <input type="email" placeholder="Seu email" style="padding: 14px 16px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 15px; background: #ffffff; outline: none;" />
          <input type="tel" placeholder="Seu telefone" style="padding: 14px 16px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 15px; background: #ffffff; outline: none;" />
          <textarea placeholder="Sua mensagem" rows="4" style="padding: 14px 16px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 15px; background: #ffffff; outline: none; resize: vertical;"></textarea>
          <button type="submit" style="padding: 14px; background: linear-gradient(135deg, #06b6d4, #14b8a6); color: #ffffff; border: none; border-radius: 10px; font-size: 16px; font-weight: 600; cursor: pointer;">Enviar Mensagem</button>
        </form>
      </div>
    </section>`,
  });

  blockManager.add('pet-pricing', {
    label: 'Preços/Pacotes',
    category,
    media: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>',
    content: `<section style="padding: 80px 20px; background: #ffffff;">
      <div style="max-width: 900px; margin: 0 auto; text-align: center;">
        <h2 style="font-size: 36px; font-weight: 700; color: #0f172a; margin-bottom: 48px;">Nossos Pacotes</h2>
        <div style="display: flex; gap: 24px; flex-wrap: wrap; justify-content: center;">
          <div style="flex: 1; min-width: 260px; max-width: 280px; padding: 32px; background: #f8fafc; border-radius: 16px; text-align: center;">
            <h3 style="font-size: 22px; font-weight: 700; color: #06b6d4; margin-bottom: 8px;">Básico</h3>
            <p style="font-size: 36px; font-weight: 800; color: #0f172a; margin-bottom: 16px;">R$ 60</p>
            <ul style="list-style: none; text-align: left; margin-bottom: 24px; padding: 0;">
              <li style="padding: 8px 0; color: #475569; border-bottom: 1px solid #e2e8f0;">✓ Item 1</li>
              <li style="padding: 8px 0; color: #475569; border-bottom: 1px solid #e2e8f0;">✓ Item 2</li>
              <li style="padding: 8px 0; color: #475569;">✓ Item 3</li>
            </ul>
            <a href="#" style="display: block; padding: 12px; background: #e0f2fe; color: #06b6d4; text-decoration: none; border-radius: 8px; font-weight: 600;">Escolher</a>
          </div>
          <div style="flex: 1; min-width: 260px; max-width: 280px; padding: 32px; background: #06b6d4; border-radius: 16px; text-align: center; transform: scale(1.05); box-shadow: 0 8px 32px rgba(6,182,212,0.3);">
            <div style="background: #fbbf24; color: #0f172a; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 20px; display: inline-block; margin-bottom: 12px;">POPULAR</div>
            <h3 style="font-size: 22px; font-weight: 700; color: #ffffff; margin-bottom: 8px;">Completo</h3>
            <p style="font-size: 36px; font-weight: 800; color: #ffffff; margin-bottom: 16px;">R$ 90</p>
            <ul style="list-style: none; text-align: left; margin-bottom: 24px; padding: 0;">
              <li style="padding: 8px 0; color: #e0f2fe; border-bottom: 1px solid rgba(255,255,255,0.15);">✓ Item 1</li>
              <li style="padding: 8px 0; color: #e0f2fe; border-bottom: 1px solid rgba(255,255,255,0.15);">✓ Item 2</li>
              <li style="padding: 8px 0; color: #e0f2fe; border-bottom: 1px solid rgba(255,255,255,0.15);">✓ Item 3</li>
              <li style="padding: 8px 0; color: #e0f2fe;">✓ Item 4</li>
            </ul>
            <a href="#" style="display: block; padding: 12px; background: #ffffff; color: #06b6d4; text-decoration: none; border-radius: 8px; font-weight: 600;">Escolher</a>
          </div>
        </div>
      </div>
    </section>`,
  });

  blockManager.add('pet-whatsapp-cta', {
    label: 'CTA WhatsApp',
    category,
    media: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>',
    content: `<section style="padding: 80px 20px; background: linear-gradient(135deg, #0f172a, #164e63);">
      <div style="max-width: 600px; margin: 0 auto; text-align: center;">
        <h2 style="font-size: 36px; font-weight: 700; color: #ffffff; margin-bottom: 16px;">Fale Conosco</h2>
        <p style="color: #94a3b8; margin-bottom: 32px; font-size: 18px;">Atendimento rápido pelo WhatsApp</p>
        <a href="https://wa.me/5511999999999" style="display: inline-block; padding: 16px 40px; background: #25d366; color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 18px;">💬 WhatsApp</a>
      </div>
    </section>`,
  });

  blockManager.add('pet-whatsapp-float', {
    label: 'WhatsApp Flutuante',
    category,
    media: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/></svg>',
    content: `<a href="https://wa.me/5511999999999" target="_blank" style="position: fixed; bottom: 24px; right: 24px; width: 60px; height: 60px; background: #25d366; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 16px rgba(37,211,102,0.4); z-index: 9999; text-decoration: none; font-size: 28px;">💬</a>`,
  });
}
