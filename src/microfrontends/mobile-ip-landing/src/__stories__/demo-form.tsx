import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import s from './demo-form.module.css';

/**
 * Демо-форма только для Storybook. На проде на её месте форма банка (отдельный блок), блок получает
 * её через проп `form`.
 */
const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, '').replace(/^[78]/, '').slice(0, 10);
  if (!digits) return '';
  const parts = [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 8), digits.slice(8, 10)];
  let out = `+7 (${parts[0]}`;
  if (digits.length > 3) out += `) ${parts[1]}`;
  if (digits.length > 6) out += `-${parts[2]}`;
  if (digits.length > 8) out += `-${parts[3]}`;
  return out;
};

type DemoFormProps = {
  layout: 'desktop' | 'mobile';
};

/** Подписи полей как в кадрах макета: на мобайле они короче. */
const PLACEHOLDERS = {
  desktop: { phone: 'Контактный телефон*', name: 'Фамилия, имя и отчество*' },
  mobile: { phone: 'Телефон', name: 'Фамилия, имя и отчество' },
};

export const DemoForm = ({ layout }: DemoFormProps) => {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [touched, setTouched] = useState(false);
  const [sent, setSent] = useState(false);
  // Высота формы на момент отправки: сообщение занимает столько же, плашки под формой не едут.
  const [sentHeight, setSentHeight] = useState<number>();
  const formRef = useRef<HTMLFormElement>(null);
  const placeholder = PLACEHOLDERS[layout];
  const phoneError = phone.replace(/\D/g, '').length === 11 ? '' : 'Укажите номер полностью';
  const nameError = name.trim().split(/\s+/).length >= 2 ? '' : 'Укажите фамилию и имя';

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (!phoneError && !nameError) {
      setSentHeight(formRef.current?.offsetHeight);
      setSent(true);
    }
  };

  if (sent) {
    return (
      <p className={s.done} role="status" style={{ minHeight: sentHeight }}>
        Это демо-форма стенда: заявка никуда не отправлена. На сайте банка здесь будет его форма.
      </p>
    );
  }

  return (
    <form
      ref={formRef}
      className={layout === 'desktop' ? s['form-desktop'] : s['form-mobile']}
      onSubmit={submit}
      noValidate
    >
      <div className={s.fields}>
        <label className={s.field}>
          <span className={s.label}>Контактный телефон*</span>
          <input
            className={touched && phoneError ? s['input-error'] : s.input}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder={placeholder.phone}
            aria-invalid={touched && Boolean(phoneError)}
            value={phone}
            onChange={(event) => setPhone(formatPhone(event.target.value))}
          />
          {touched && phoneError && <span className={s.error}>{phoneError}</span>}
        </label>
        <label className={s.field}>
          <span className={s.label}>Фамилия, имя и отчество*</span>
          <input
            className={touched && nameError ? s['input-error'] : s.input}
            autoComplete="name"
            placeholder={placeholder.name}
            aria-invalid={touched && Boolean(nameError)}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          {touched && nameError && <span className={s.error}>{nameError}</span>}
        </label>
      </div>
      <div className={s.footer}>
        <p className={s.legal}>
          Заполняя форму, вы соглашаетесь с{' '}
          <a
            className={s.link}
            href="https://www.tbank.ru/business/"
            target="_blank"
            rel="noreferrer"
          >
            условиями
          </a>
        </p>
        <button className={s.submit} type="submit">
          Начать свой бизнес
        </button>
      </div>
    </form>
  );
};
