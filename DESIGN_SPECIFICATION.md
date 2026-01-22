# Спецификация дизайна фронтенда SyncWatch
## Apple Liquid Glass Design System

**Версия:** 1.0
**Дата:** 22.01.2026
**Дизайн-язык:** Apple Liquid Glass

---

## Содержание

1. [Введение в Liquid Glass](#1-введение-в-liquid-glass)
2. [Основные принципы](#2-основные-принципы)
3. [Цветовая система](#3-цветовая-система)
4. [Типографика](#4-типографика)
5. [Материалы и эффекты](#5-материалы-и-эффекты)
6. [Компоненты UI](#6-компоненты-ui)
7. [Анимации и переходы](#7-анимации-и-переходы)
8. [Адаптивность и доступность](#8-адаптивность-и-доступность)
9. [Реализация в коде](#9-реализация-в-коде)
10. [Дизайн-система компонентов](#10-дизайн-система-компонентов)

---

## 1. Введение в Liquid Glass

### 1.1 Что такое Liquid Glass?

**Liquid Glass** — это дизайн-язык Apple, представленный в 2025 году на WWDC, который объединяет принципы glassmorphism с физически точным преломлением света и динамической адаптацией к окружению.

#### Ключевые характеристики:

- **Полупрозрачные поверхности** с эффектом размытия (frosted glass)
- **Физически точное преломление** света и отражение
- **Динамическая адаптация** к контенту под стеклом
- **GPU-ускоренные эффекты** для плавной работы
- **Единая система** для всех платформ (iOS, macOS, visionOS)

### 1.2 Философия дизайна

> "Controls float above content using glass layers instead of solid blocks"
> — Apple Design Guidelines

Liquid Glass создает **иерархию через глубину**, где:
- Интерактивные элементы "парят" над контентом
- Стеклянные поверхности создают визуальное разделение без жестких границ
- Контент остается различимым через полупрозрачные слои

### 1.3 Применение в SyncWatch

Для SyncWatch мы используем Liquid Glass для:
- **Плеера** — стеклянная панель управления над видео
- **Чата** — полупрозрачное окно чата
- **Списка участников** — floating panel
- **Модальных окон** — стеклянные диалоги
- **Навигации** — прозрачная шапка сайта

---

## 2. Основные принципы

### 2.1 Три столпа Liquid Glass

#### Принцип 1: Глубина через прозрачность (Depth Through Transparency)

Элементы создают **визуальную иерархию** через слои стекла:

```
┌─────────────────────────────────────┐
│  Layer 3: Modals (80% blur)         │  ← Самый верхний
│  ┌────────────────────────────┐     │
│  │ Layer 2: Controls (60% blur) │   │  ← Средний
│  │ ┌────────────────────────┐ │     │
│  │ │ Layer 1: Content (0%)  │ │     │  ← Базовый контент
│  │ └────────────────────────┘ │     │
│  └────────────────────────────┘     │
└─────────────────────────────────────┘
```

**Правила:**
- Базовый контент не размыт
- Элементы управления размыты на 40-60%
- Модальные окна размыты на 70-90%

#### Принцип 2: Адаптивность к окружению (Environmental Adaptation)

Стекло **адаптируется** к цвету и яркости контента под ним:

```css
/* Светлый фон → темнее стекло */
background: rgba(0, 0, 0, 0.15);

/* Темный фон → светлее стекло */
background: rgba(255, 255, 255, 0.10);
```

#### Принцип 3: Физически точное поведение (Physically Accurate Behavior)

Стекло ведет себя как настоящее:
- **Преломляет** свет (backdrop-filter: blur)
- **Отражает** окружение (gradients, highlights)
- **Реагирует** на движение (subtle parallax)

### 2.2 Инварианты дизайна

Следующие правила **всегда истинны**:

1. ✅ **Читаемость превыше эстетики** — текст всегда читаем
2. ✅ **Контраст для интерактивных элементов** — кнопки четко видны
3. ✅ **Размытие не превышает 50px** — чрезмерное размытие запрещено
4. ✅ **Минимум 3 уровня глубины** — базовый контент, UI, модалы
5. ✅ **Анимации до 400ms** — быстрые, естественные переходы

---

## 3. Цветовая система

### 3.1 Основная палитра (Glass Tints)

#### Светлая тема (Light Mode)

```css
/* Glass Surfaces */
--glass-light-1: rgba(255, 255, 255, 0.70);  /* Primary glass */
--glass-light-2: rgba(255, 255, 255, 0.50);  /* Secondary glass */
--glass-light-3: rgba(255, 255, 255, 0.30);  /* Tertiary glass */

/* Accents */
--accent-blue:   rgba(0, 122, 255, 1.0);     /* Primary action */
--accent-purple: rgba(175, 82, 222, 1.0);    /* Secondary */
--accent-green:  rgba(52, 199, 89, 1.0);     /* Success */
--accent-red:    rgba(255, 59, 48, 1.0);     /* Error */

/* Text on glass */
--text-primary:   rgba(0, 0, 0, 0.90);
--text-secondary: rgba(0, 0, 0, 0.60);
--text-tertiary:  rgba(0, 0, 0, 0.40);
```

#### Темная тема (Dark Mode)

```css
/* Glass Surfaces */
--glass-dark-1: rgba(30, 30, 30, 0.80);      /* Primary glass */
--glass-dark-2: rgba(50, 50, 50, 0.60);      /* Secondary glass */
--glass-dark-3: rgba(70, 70, 70, 0.40);      /* Tertiary glass */

/* Accents (остаются яркими) */
--accent-blue:   rgba(10, 132, 255, 1.0);
--accent-purple: rgba(191, 90, 242, 1.0);
--accent-green:  rgba(48, 209, 88, 1.0);
--accent-red:    rgba(255, 69, 58, 1.0);

/* Text on glass */
--text-primary:   rgba(255, 255, 255, 0.95);
--text-secondary: rgba(255, 255, 255, 0.70);
--text-tertiary:  rgba(255, 255, 255, 0.50);
```

### 3.2 Семантические цвета

```css
/* Status colors */
--status-online:  rgba(52, 199, 89, 1.0);
--status-busy:    rgba(255, 149, 0, 1.0);
--status-offline: rgba(142, 142, 147, 1.0);

/* Notification colors */
--notification-info:    rgba(0, 122, 255, 1.0);
--notification-success: rgba(52, 199, 89, 1.0);
--notification-warning: rgba(255, 149, 0, 1.0);
--notification-error:   rgba(255, 59, 48, 1.0);
```

### 3.3 Градиенты

```css
/* Glass shimmer gradient (для highlight эффектов) */
--glass-shimmer: linear-gradient(
  135deg,
  rgba(255, 255, 255, 0.3) 0%,
  rgba(255, 255, 255, 0.0) 50%,
  rgba(255, 255, 255, 0.3) 100%
);

/* Depth gradient (для создания глубины) */
--depth-gradient: linear-gradient(
  180deg,
  rgba(255, 255, 255, 0.15) 0%,
  rgba(255, 255, 255, 0.05) 100%
);
```

---

## 4. Типографика

### 4.1 Шрифтовая система

#### Основной шрифт

Используем **SF Pro** (системный шрифт Apple) или веб-аналоги:

```css
--font-primary: -apple-system, BlinkMacSystemFont, "SF Pro Text",
                "Segoe UI", "Helvetica Neue", Arial, sans-serif;

--font-display: -apple-system, BlinkMacSystemFont, "SF Pro Display",
                "Segoe UI", "Helvetica Neue", Arial, sans-serif;

--font-mono: "SF Mono", "Monaco", "Cascadia Code", "Consolas", monospace;
```

### 4.2 Размеры шрифтов

```css
/* Display (заголовки страниц) */
--text-display-1: 48px;  /* Hero title */
--text-display-2: 36px;  /* Page title */
--text-display-3: 28px;  /* Section title */

/* Headings */
--text-h1: 24px;
--text-h2: 20px;
--text-h3: 18px;

/* Body */
--text-body-large:  17px;  /* Primary text */
--text-body:        15px;  /* Default */
--text-body-small:  13px;  /* Secondary */

/* Caption */
--text-caption: 11px;
--text-micro:   10px;
```

### 4.3 Начертания (Font Weights)

```css
--font-weight-light:    300;
--font-weight-regular:  400;
--font-weight-medium:   500;
--font-weight-semibold: 600;
--font-weight-bold:     700;
```

### 4.4 Межстрочный интервал

```css
--line-height-tight:  1.2;   /* Заголовки */
--line-height-normal: 1.5;   /* Body text */
--line-height-loose:  1.7;   /* Длинные тексты */
```

### 4.5 Примеры использования

```css
/* Hero title */
h1 {
  font-family: var(--font-display);
  font-size: var(--text-display-1);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-tight);
  letter-spacing: -0.02em;
}

/* Body text на стекле */
.glass-text {
  font-family: var(--font-primary);
  font-size: var(--text-body);
  font-weight: var(--font-weight-regular);
  line-height: var(--line-height-normal);
  color: var(--text-primary);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1); /* Улучшает читаемость */
}
```

---

## 5. Материалы и эффекты

### 5.1 Базовый Glass Material

Основной материал для всех стеклянных поверхностей:

```css
.glass-material {
  /* Размытие фона */
  backdrop-filter: blur(40px) saturate(180%);
  -webkit-backdrop-filter: blur(40px) saturate(180%);

  /* Полупрозрачный фон */
  background: rgba(255, 255, 255, 0.70);

  /* Граница для четкости */
  border: 1px solid rgba(255, 255, 255, 0.30);

  /* Скругленные углы */
  border-radius: 16px;

  /* Мягкая тень для глубины */
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.08),
    0 1px 3px rgba(0, 0, 0, 0.04),
    inset 0 1px 0 rgba(255, 255, 255, 0.5);
}

/* Темная тема */
@media (prefers-color-scheme: dark) {
  .glass-material {
    background: rgba(30, 30, 30, 0.80);
    border: 1px solid rgba(255, 255, 255, 0.12);
    box-shadow:
      0 8px 32px rgba(0, 0, 0, 0.4),
      0 1px 3px rgba(0, 0, 0, 0.2),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }
}
```

### 5.2 Варианты интенсивности

```css
/* Ultra Thin (10% blur) - для navbar */
.glass-ultra-thin {
  backdrop-filter: blur(10px) saturate(120%);
  background: rgba(255, 255, 255, 0.50);
}

/* Thin (20px blur) - для sidebars */
.glass-thin {
  backdrop-filter: blur(20px) saturate(150%);
  background: rgba(255, 255, 255, 0.60);
}

/* Regular (40px blur) - для panels */
.glass-regular {
  backdrop-filter: blur(40px) saturate(180%);
  background: rgba(255, 255, 255, 0.70);
}

/* Thick (60px blur) - для modals */
.glass-thick {
  backdrop-filter: blur(60px) saturate(200%);
  background: rgba(255, 255, 255, 0.80);
}
```

### 5.3 Эффект преломления (Refraction)

Для создания эффекта преломления света:

```css
.glass-refraction {
  position: relative;
  overflow: hidden;
}

.glass-refraction::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: var(--glass-shimmer);
  transform: skewX(-25deg);
  animation: shimmer 3s infinite;
}

@keyframes shimmer {
  0% { left: -100%; }
  50% { left: 100%; }
  100% { left: 100%; }
}
```

### 5.4 Highlight эффект

Добавляет световую подсветку сверху:

```css
.glass-highlight {
  position: relative;
}

.glass-highlight::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.6) 50%,
    rgba(255, 255, 255, 0) 100%
  );
}
```

### 5.5 Тени (Shadows)

```css
/* Elevated - элементы над поверхностью */
--shadow-elevated:
  0 4px 16px rgba(0, 0, 0, 0.12),
  0 1px 2px rgba(0, 0, 0, 0.06);

/* Floating - плавающие элементы (кнопки, карточки) */
--shadow-floating:
  0 8px 32px rgba(0, 0, 0, 0.16),
  0 2px 8px rgba(0, 0, 0, 0.08);

/* Modal - модальные окна */
--shadow-modal:
  0 24px 64px rgba(0, 0, 0, 0.24),
  0 8px 16px rgba(0, 0, 0, 0.12);

/* Ambient - тонкая тень для separation */
--shadow-ambient:
  0 1px 3px rgba(0, 0, 0, 0.08);
```

---

## 6. Компоненты UI

### 6.1 Кнопки (Buttons)

#### Primary Button (стеклянная)

```css
.btn-primary {
  /* Glass material */
  backdrop-filter: blur(20px) saturate(180%);
  background: rgba(0, 122, 255, 0.85);

  /* Typography */
  font-family: var(--font-primary);
  font-size: var(--text-body);
  font-weight: var(--font-weight-semibold);
  color: white;

  /* Spacing */
  padding: 12px 24px;
  border-radius: 12px;

  /* Border */
  border: 1px solid rgba(255, 255, 255, 0.20);

  /* Shadow */
  box-shadow:
    0 4px 16px rgba(0, 122, 255, 0.30),
    0 1px 3px rgba(0, 0, 0, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);

  /* Interaction */
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary:hover {
  background: rgba(0, 122, 255, 0.95);
  transform: translateY(-1px);
  box-shadow:
    0 6px 24px rgba(0, 122, 255, 0.40),
    0 2px 6px rgba(0, 0, 0, 0.16);
}

.btn-primary:active {
  transform: translateY(0);
  box-shadow:
    0 2px 8px rgba(0, 122, 255, 0.25),
    0 1px 2px rgba(0, 0, 0, 0.12);
}
```

#### Secondary Button (прозрачная)

```css
.btn-secondary {
  backdrop-filter: blur(20px) saturate(150%);
  background: rgba(255, 255, 255, 0.15);

  font-family: var(--font-primary);
  font-size: var(--text-body);
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);

  padding: 12px 24px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.25);

  box-shadow: var(--shadow-elevated);
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.25);
  border-color: rgba(255, 255, 255, 0.35);
}
```

### 6.2 Inputs (поля ввода)

```css
.input-glass {
  /* Glass material */
  backdrop-filter: blur(20px) saturate(150%);
  background: rgba(255, 255, 255, 0.50);

  /* Typography */
  font-family: var(--font-primary);
  font-size: var(--text-body);
  color: var(--text-primary);

  /* Spacing */
  padding: 12px 16px;
  border-radius: 10px;

  /* Border */
  border: 1px solid rgba(255, 255, 255, 0.30);

  /* Shadow */
  box-shadow:
    inset 0 1px 3px rgba(0, 0, 0, 0.06),
    0 1px 2px rgba(0, 0, 0, 0.04);

  transition: all 0.2s ease;
}

.input-glass:focus {
  outline: none;
  background: rgba(255, 255, 255, 0.70);
  border-color: var(--accent-blue);
  box-shadow:
    inset 0 1px 3px rgba(0, 0, 0, 0.06),
    0 0 0 3px rgba(0, 122, 255, 0.15);
}

.input-glass::placeholder {
  color: var(--text-tertiary);
}
```

### 6.3 Карточки (Cards)

```css
.card-glass {
  /* Glass material */
  backdrop-filter: blur(40px) saturate(180%);
  background: rgba(255, 255, 255, 0.70);

  /* Structure */
  padding: 24px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.30);

  /* Shadow */
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.08),
    0 1px 3px rgba(0, 0, 0, 0.04),
    inset 0 1px 0 rgba(255, 255, 255, 0.5);

  /* Interaction */
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.card-glass:hover {
  transform: translateY(-2px);
  box-shadow:
    0 12px 40px rgba(0, 0, 0, 0.12),
    0 2px 6px rgba(0, 0, 0, 0.06);
}
```

### 6.4 Модальные окна (Modals)

```css
/* Backdrop (фон за модалом) */
.modal-backdrop {
  position: fixed;
  inset: 0;
  backdrop-filter: blur(20px) saturate(150%);
  background: rgba(0, 0, 0, 0.40);
  z-index: 1000;
}

/* Modal container */
.modal-glass {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);

  /* Glass material */
  backdrop-filter: blur(60px) saturate(200%);
  background: rgba(255, 255, 255, 0.85);

  /* Structure */
  padding: 32px;
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.40);

  /* Shadow */
  box-shadow: var(--shadow-modal);

  /* Constraints */
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;

  z-index: 1001;
}
```

### 6.5 Навигация (Navigation Bar)

```css
.navbar-glass {
  position: sticky;
  top: 0;
  z-index: 100;

  /* Glass material */
  backdrop-filter: blur(20px) saturate(180%);
  background: rgba(255, 255, 255, 0.75);

  /* Structure */
  padding: 16px 24px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);

  /* Shadow */
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.06),
    inset 0 -1px 0 rgba(255, 255, 255, 0.5);
}
```

### 6.6 Sidebar / Panel

```css
.sidebar-glass {
  /* Glass material */
  backdrop-filter: blur(40px) saturate(180%);
  background: rgba(255, 255, 255, 0.65);

  /* Structure */
  width: 300px;
  height: 100vh;
  padding: 24px;
  border-right: 1px solid rgba(0, 0, 0, 0.08);

  /* Shadow */
  box-shadow:
    4px 0 24px rgba(0, 0, 0, 0.08),
    inset -1px 0 0 rgba(255, 255, 255, 0.5);
}
```

---

## 7. Анимации и переходы

### 7.1 Кривые анимации (Easing Functions)

```css
/* Apple-style easing */
--ease-in-out:    cubic-bezier(0.4, 0, 0.2, 1);      /* Стандартная */
--ease-out:       cubic-bezier(0.0, 0, 0.2, 1);      /* Появление */
--ease-in:        cubic-bezier(0.4, 0, 1, 1);        /* Исчезновение */
--ease-sharp:     cubic-bezier(0.4, 0, 0.6, 1);      /* Резкая */
--ease-spring:    cubic-bezier(0.175, 0.885, 0.32, 1.275);  /* Пружина */
```

### 7.2 Длительность

```css
--duration-instant: 100ms;   /* Мгновенно */
--duration-fast:    200ms;   /* Быстро */
--duration-normal:  300ms;   /* Стандарт */
--duration-slow:    400ms;   /* Медленно */
--duration-slower:  600ms;   /* Очень медленно */
```

### 7.3 Переходы для Glass элементов

```css
.glass-transition {
  transition:
    background 300ms var(--ease-in-out),
    backdrop-filter 300ms var(--ease-in-out),
    transform 200ms var(--ease-out),
    box-shadow 200ms var(--ease-out),
    border-color 200ms var(--ease-in-out);
}
```

### 7.4 Fade In (появление)

```css
@keyframes fadeInGlass {
  from {
    opacity: 0;
    backdrop-filter: blur(0px);
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    backdrop-filter: blur(40px);
    transform: scale(1);
  }
}

.fade-in-glass {
  animation: fadeInGlass 300ms var(--ease-out) forwards;
}
```

### 7.5 Slide In (вход со стороны)

```css
@keyframes slideInGlass {
  from {
    opacity: 0;
    transform: translateY(20px);
    backdrop-filter: blur(0px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
    backdrop-filter: blur(40px);
  }
}

.slide-in-glass {
  animation: slideInGlass 400ms var(--ease-out) forwards;
}
```

### 7.6 Hover эффекты

```css
/* Lift on hover */
.hover-lift {
  transition: transform 200ms var(--ease-out);
}

.hover-lift:hover {
  transform: translateY(-4px);
}

/* Glow on hover */
.hover-glow {
  transition: box-shadow 300ms var(--ease-in-out);
}

.hover-glow:hover {
  box-shadow:
    0 12px 40px rgba(0, 122, 255, 0.25),
    0 4px 12px rgba(0, 122, 255, 0.15);
}

/* Brightness on hover */
.hover-brightness {
  transition: filter 200ms var(--ease-in-out);
}

.hover-brightness:hover {
  filter: brightness(1.1);
}
```

### 7.7 Loading анимация

```css
@keyframes glassShimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

.loading-glass {
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.0) 0%,
    rgba(255, 255, 255, 0.3) 50%,
    rgba(255, 255, 255, 0.0) 100%
  );
  background-size: 200% 100%;
  animation: glassShimmer 2s infinite;
}
```

---

## 8. Адаптивность и доступность

### 8.1 Reduced Transparency

Для пользователей с включенной настройкой "Reduce Transparency":

```css
@media (prefers-reduced-transparency: reduce) {
  .glass-material {
    backdrop-filter: none;
    background: rgba(255, 255, 255, 0.95); /* Почти непрозрачный */
    border: 1px solid rgba(0, 0, 0, 0.12);
  }
}
```

### 8.2 Increased Contrast

Для пользователей с включенной настройкой "Increase Contrast":

```css
@media (prefers-contrast: more) {
  .glass-material {
    background: rgba(255, 255, 255, 0.95);
    border: 2px solid rgba(0, 0, 0, 0.30);
  }

  .btn-primary {
    background: rgba(0, 122, 255, 1.0); /* Полностью непрозрачный */
    border: 2px solid rgba(0, 0, 0, 0.20);
  }
}
```

### 8.3 Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 8.4 Dark Mode

```css
@media (prefers-color-scheme: dark) {
  :root {
    --glass-primary: rgba(30, 30, 30, 0.80);
    --text-primary: rgba(255, 255, 255, 0.95);
    /* ... остальные переменные ... */
  }
}
```

### 8.5 Responsive Breakpoints

```css
/* Mobile First подход */
--breakpoint-sm: 640px;   /* Смартфоны */
--breakpoint-md: 768px;   /* Планшеты */
--breakpoint-lg: 1024px;  /* Ноутбуки */
--breakpoint-xl: 1280px;  /* Десктопы */
--breakpoint-2xl: 1536px; /* Большие экраны */
```

Пример использования:

```css
/* Mobile */
.glass-panel {
  backdrop-filter: blur(20px);
  padding: 16px;
  border-radius: 12px;
}

/* Tablet */
@media (min-width: 768px) {
  .glass-panel {
    backdrop-filter: blur(40px);
    padding: 24px;
    border-radius: 16px;
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .glass-panel {
    backdrop-filter: blur(60px);
    padding: 32px;
    border-radius: 20px;
  }
}
```

---

## 9. Реализация в коде

### 9.1 CSS Variables Setup

**Файл: `client/src/styles/glass-variables.css`**

```css
:root {
  /* === Colors === */

  /* Glass Surfaces (Light Mode) */
  --glass-light-1: rgba(255, 255, 255, 0.70);
  --glass-light-2: rgba(255, 255, 255, 0.50);
  --glass-light-3: rgba(255, 255, 255, 0.30);

  /* Glass Surfaces (Dark Mode) */
  --glass-dark-1: rgba(30, 30, 30, 0.80);
  --glass-dark-2: rgba(50, 50, 50, 0.60);
  --glass-dark-3: rgba(70, 70, 70, 0.40);

  /* Accent Colors */
  --accent-blue:   #007AFF;
  --accent-purple: #AF52DE;
  --accent-green:  #34C759;
  --accent-red:    #FF3B30;
  --accent-orange: #FF9500;

  /* Text Colors */
  --text-primary:   rgba(0, 0, 0, 0.90);
  --text-secondary: rgba(0, 0, 0, 0.60);
  --text-tertiary:  rgba(0, 0, 0, 0.40);

  /* === Typography === */
  --font-primary: -apple-system, BlinkMacSystemFont, "SF Pro Text",
                  "Segoe UI", "Helvetica Neue", Arial, sans-serif;
  --font-display: -apple-system, BlinkMacSystemFont, "SF Pro Display",
                  "Segoe UI", "Helvetica Neue", Arial, sans-serif;

  /* Font Sizes */
  --text-display-1: 48px;
  --text-display-2: 36px;
  --text-h1: 24px;
  --text-h2: 20px;
  --text-body: 15px;
  --text-caption: 13px;

  /* Font Weights */
  --font-regular:  400;
  --font-medium:   500;
  --font-semibold: 600;
  --font-bold:     700;

  /* === Spacing === */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;

  /* === Border Radius === */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 20px;
  --radius-2xl: 24px;
  --radius-full: 9999px;

  /* === Shadows === */
  --shadow-elevated:
    0 4px 16px rgba(0, 0, 0, 0.12),
    0 1px 2px rgba(0, 0, 0, 0.06);

  --shadow-floating:
    0 8px 32px rgba(0, 0, 0, 0.16),
    0 2px 8px rgba(0, 0, 0, 0.08);

  --shadow-modal:
    0 24px 64px rgba(0, 0, 0, 0.24),
    0 8px 16px rgba(0, 0, 0, 0.12);

  /* === Animation === */
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-out: cubic-bezier(0.0, 0, 0.2, 1);
  --ease-in: cubic-bezier(0.4, 0, 1, 1);

  --duration-fast: 200ms;
  --duration-normal: 300ms;
  --duration-slow: 400ms;
}

/* Dark Mode */
@media (prefers-color-scheme: dark) {
  :root {
    --text-primary:   rgba(255, 255, 255, 0.95);
    --text-secondary: rgba(255, 255, 255, 0.70);
    --text-tertiary:  rgba(255, 255, 255, 0.50);
  }
}
```

### 9.2 Glass Utility Classes

**Файл: `client/src/styles/glass-utilities.css`**

```css
/* === Glass Materials === */

.glass-ultra-thin {
  backdrop-filter: blur(10px) saturate(120%);
  -webkit-backdrop-filter: blur(10px) saturate(120%);
  background: var(--glass-light-1);
  border: 1px solid rgba(255, 255, 255, 0.30);
}

.glass-thin {
  backdrop-filter: blur(20px) saturate(150%);
  -webkit-backdrop-filter: blur(20px) saturate(150%);
  background: var(--glass-light-1);
  border: 1px solid rgba(255, 255, 255, 0.30);
}

.glass {
  backdrop-filter: blur(40px) saturate(180%);
  -webkit-backdrop-filter: blur(40px) saturate(180%);
  background: var(--glass-light-1);
  border: 1px solid rgba(255, 255, 255, 0.30);
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.08),
    0 1px 3px rgba(0, 0, 0, 0.04),
    inset 0 1px 0 rgba(255, 255, 255, 0.5);
}

.glass-thick {
  backdrop-filter: blur(60px) saturate(200%);
  -webkit-backdrop-filter: blur(60px) saturate(200%);
  background: rgba(255, 255, 255, 0.80);
  border: 1px solid rgba(255, 255, 255, 0.40);
  box-shadow: var(--shadow-modal);
}

/* Dark Mode Variants */
@media (prefers-color-scheme: dark) {
  .glass-ultra-thin {
    background: var(--glass-dark-3);
    border: 1px solid rgba(255, 255, 255, 0.10);
  }

  .glass-thin {
    background: var(--glass-dark-2);
    border: 1px solid rgba(255, 255, 255, 0.12);
  }

  .glass {
    background: var(--glass-dark-1);
    border: 1px solid rgba(255, 255, 255, 0.12);
    box-shadow:
      0 8px 32px rgba(0, 0, 0, 0.4),
      0 1px 3px rgba(0, 0, 0, 0.2),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }

  .glass-thick {
    background: rgba(30, 30, 30, 0.90);
    border: 1px solid rgba(255, 255, 255, 0.15);
  }
}

/* === Border Radius === */
.rounded-sm { border-radius: var(--radius-sm); }
.rounded-md { border-radius: var(--radius-md); }
.rounded-lg { border-radius: var(--radius-lg); }
.rounded-xl { border-radius: var(--radius-xl); }
.rounded-2xl { border-radius: var(--radius-2xl); }
.rounded-full { border-radius: var(--radius-full); }

/* === Shadows === */
.shadow-elevated { box-shadow: var(--shadow-elevated); }
.shadow-floating { box-shadow: var(--shadow-floating); }
.shadow-modal { box-shadow: var(--shadow-modal); }

/* === Transitions === */
.transition-glass {
  transition:
    background var(--duration-normal) var(--ease-in-out),
    backdrop-filter var(--duration-normal) var(--ease-in-out),
    transform var(--duration-fast) var(--ease-out),
    box-shadow var(--duration-fast) var(--ease-out);
}

/* === Hover Effects === */
.hover-lift {
  transition: transform var(--duration-fast) var(--ease-out);
}

.hover-lift:hover {
  transform: translateY(-4px);
}

.hover-glow:hover {
  box-shadow:
    0 12px 40px rgba(0, 122, 255, 0.25),
    0 4px 12px rgba(0, 122, 255, 0.15);
}
```

### 9.3 Tailwind CSS Кастомизация

**Файл: `client/tailwind.config.js`**

```js
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        glass: {
          light: {
            1: 'rgba(255, 255, 255, 0.70)',
            2: 'rgba(255, 255, 255, 0.50)',
            3: 'rgba(255, 255, 255, 0.30)',
          },
          dark: {
            1: 'rgba(30, 30, 30, 0.80)',
            2: 'rgba(50, 50, 50, 0.60)',
            3: 'rgba(70, 70, 70, 0.40)',
          },
        },
        accent: {
          blue: '#007AFF',
          purple: '#AF52DE',
          green: '#34C759',
          red: '#FF3B30',
          orange: '#FF9500',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"',
               '"Segoe UI"', '"Helvetica Neue"', 'Arial', 'sans-serif'],
        display: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"',
                  '"Segoe UI"', '"Helvetica Neue"', 'Arial', 'sans-serif'],
      },
      fontSize: {
        'display-1': '48px',
        'display-2': '36px',
      },
      backdropBlur: {
        'xs': '2px',
        'sm': '10px',
        'md': '20px',
        'lg': '40px',
        'xl': '60px',
      },
      boxShadow: {
        'elevated': '0 4px 16px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.06)',
        'floating': '0 8px 32px rgba(0, 0, 0, 0.16), 0 2px 8px rgba(0, 0, 0, 0.08)',
        'modal': '0 24px 64px rgba(0, 0, 0, 0.24), 0 8px 16px rgba(0, 0, 0, 0.12)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.5)',
      },
      transitionTimingFunction: {
        'apple': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
}
```

### 9.4 React Component Example

**Файл: `client/src/components/UI/GlassButton.tsx`**

```tsx
import React from 'react';

interface GlassButtonProps {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export function GlassButton({
  variant = 'primary',
  size = 'md',
  children,
  onClick,
  disabled = false,
  className = '',
}: GlassButtonProps) {
  const baseClasses = `
    glass
    rounded-lg
    transition-glass
    font-medium
    cursor-pointer
    hover:brightness-110
    active:scale-95
    disabled:opacity-50
    disabled:cursor-not-allowed
  `;

  const variantClasses = {
    primary: 'bg-accent-blue/85 text-white shadow-floating hover:shadow-glow',
    secondary: 'bg-white/15 text-gray-900 dark:text-white shadow-elevated',
  };

  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
```

---

## 10. Дизайн-система компонентов

### 10.1 Видеоплеер (Video Player)

**Концепт:** Плеер с полупрозрачными элементами управления над видео

```tsx
// PlayerControls.tsx
<div className="
  absolute bottom-0 left-0 right-0
  glass
  rounded-b-2xl
  p-6
  transform translate-y-full
  group-hover:translate-y-0
  transition-transform duration-300
">
  {/* Progress bar, buttons, etc. */}
</div>
```

**CSS:**
```css
.player-controls {
  backdrop-filter: blur(40px) saturate(180%);
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.80),
    rgba(0, 0, 0, 0.40)
  );
  border-top: 1px solid rgba(255, 255, 255, 0.15);
}
```

### 10.2 Чат (Chat Panel)

**Концепт:** Floating sidebar с glass эффектом

```tsx
<div className="
  fixed right-0 top-0
  w-80 h-screen
  glass
  border-l border-white/20
  shadow-floating
">
  <div className="p-6">
    {/* Chat messages */}
  </div>
</div>
```

### 10.3 Список участников (Participants List)

```tsx
<div className="glass rounded-2xl p-6 shadow-elevated">
  <h2 className="font-semibold text-lg mb-4">
    Participants ({count})
  </h2>

  <div className="space-y-2">
    {participants.map(p => (
      <div
        key={p.id}
        className="
          glass-thin
          rounded-lg
          p-3
          flex items-center gap-3
          hover:bg-white/20
          transition-colors
        "
      >
        {/* Participant info */}
      </div>
    ))}
  </div>
</div>
```

### 10.4 Модальное окно (Modal)

```tsx
{/* Backdrop */}
<div className="
  fixed inset-0
  backdrop-blur-md
  bg-black/40
  z-50
" />

{/* Modal */}
<div className="
  fixed top-1/2 left-1/2
  -translate-x-1/2 -translate-y-1/2
  glass-thick
  rounded-3xl
  p-8
  shadow-modal
  max-w-lg w-full
  z-50
">
  {/* Modal content */}
</div>
```

### 10.5 Уведомления (Notifications)

```tsx
<div className="
  fixed top-4 right-4
  glass
  rounded-2xl
  p-4
  shadow-floating
  min-w-[300px]
  animate-slide-in
">
  <div className="flex items-start gap-3">
    <div className="
      w-10 h-10
      rounded-full
      bg-accent-blue/20
      flex items-center justify-center
    ">
      {/* Icon */}
    </div>

    <div className="flex-1">
      <h4 className="font-semibold">Notification Title</h4>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Notification message
      </p>
    </div>
  </div>
</div>
```

---

## Источники

Спецификация создана на основе официальных материалов и анализа дизайна Apple Liquid Glass:

- [Liquid Glass UI 2026: Apple's New Design Language - Medium](https://medium.com/@expertappdevs/liquid-glass-2026-apples-new-design-language-6a709e49ca8b)
- [Apple's Liquid Glass Design Explained - Motion The Agency](https://www.motiontheagency.com/blog/apple-liquid-glass-design)
- [Glassmorphism in 2025: How Apple's Liquid Glass is reshaping interface design](https://www.everydayux.net/glassmorphism-apple-liquid-glass-interface-design/)
- [Apple introduces a delightful and elegant new software design - Apple Newsroom](https://www.apple.com/newsroom/2025/06/apple-introduces-a-delightful-and-elegant-new-software-design/)
- [How to create Liquid Glass effects with CSS and SVG - LogRocket](https://blog.logrocket.com/how-create-liquid-glass-effects-css-and-svg/)
- [Getting Clarity on Apple's Liquid Glass - CSS-Tricks](https://css-tricks.com/getting-clarity-on-apples-liquid-glass/)
- [iOS Crystalline Blurred Backgrounds with CSS Backdrop Filters](https://fjolt.com/article/css-ios-crystalline-effect-backdrop-filter)

---

**Конец спецификации дизайна**

**Версия:** 1.0
**Дата:** 22 января 2026
**Статус:** ✅ Готов к использованию
