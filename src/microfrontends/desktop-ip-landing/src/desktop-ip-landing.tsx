import { useCallback, useEffect, useId, useRef } from 'react';
import type { CSSProperties } from 'react';
import { Hero } from './components/hero/hero';
import { ProcessSection } from './components/process/process';
import { scrollToForm } from './lib/motion';
import { hasSlot } from './lib/slot';
import type { DesktopIpLandingProps } from './types';
import s from './styles.module.css';

export const DesktopIpLanding = ({
  titleHtml,
  heroBackground,
  formTitle,
  form,
  benefits,
  process,
  headerOffset = 96,
  bleedUnderHeader = false,
}: DesktopIpLandingProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const processId = `aic-ip-process-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const withForm = hasSlot(form);
  // Ожидание фокуса в форме (lib/motion.ts): новый переход и размонтирование его снимают.
  const cancelFocusRef = useRef<() => void>();
  const toForm = useCallback(() => {
    cancelFocusRef.current?.();
    cancelFocusRef.current = scrollToForm(formRef.current, rootRef.current);
  }, []);
  useEffect(() => () => cancelFocusRef.current?.(), []);

  return (
    <div
      ref={rootRef}
      data-aic-ip-root=""
      className={s.root}
      style={{ '--aic-ip-header': `${headerOffset}px` } as CSSProperties}
    >
      <Hero
        titleHtml={titleHtml}
        background={heroBackground}
        formTitle={formTitle}
        form={withForm ? form : null}
        formRef={formRef}
        benefits={benefits}
        bleed={bleedUnderHeader}
      />
      <ProcessSection id={processId} process={process} onToForm={withForm ? toForm : null} />
    </div>
  );
};
