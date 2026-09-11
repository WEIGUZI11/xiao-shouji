import { ChevronLeft, CircleUserRound } from 'lucide-react';
import React from 'react';

import { cn } from '../../lib/utils';
import type { Character } from '../../store';
import { useAppStore } from '../../store';

export function Header({
  title,
  subtitle,
  tabs,
  tabsClassName,
  onSave,
  onBack,
  saveLabel = '保存',
}: {
  title: string;
  subtitle?: string;
  tabs?: React.ReactNode;
  tabsClassName?: string;
  onSave?: () => void;
  onBack?: () => void;
  saveLabel?: string;
}) {
  const { goBack } = useAppStore();
  return (
    <header className="sticky top-0 z-30 bg-[var(--phone-bg)] px-4 pb-4 pt-6">
      <div className="grid grid-cols-[48px_1fr_56px] items-center">
        <button onClick={onBack || goBack} className="circle-button" aria-label="返回">
          <ChevronLeft className="h-7 w-7" aria-hidden />
        </button>
        <div className="min-w-0 text-center">
          <h1 className="truncate text-2xl font-black">{title}</h1>
          {subtitle && <p className="truncate text-xs font-bold opacity-60">{subtitle}</p>}
        </div>
        {onSave ? <button onClick={onSave} className="save-button">{saveLabel}</button> : <span />}
      </div>
      {tabs && <div className={cn('no-scrollbar mt-5 gap-2', tabsClassName || 'flex overflow-x-auto')}>{tabs}</div>}
    </header>
  );
}

export function Pill({
  icon,
  label,
  active,
  onClick,
}: {
  key?: React.Key;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button onClick={onClick} className={cn('pill', active && 'active')}>
      {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: 'h-4 w-4' })}
      {label}
    </button>
  );
}

export function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <label className="mb-5 block last:mb-0">
      <span className="mb-2 flex items-center gap-2 text-lg font-black">
        {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: 'h-5 w-5' })}
        {label}
      </span>
      {children}
    </label>
  );
}

export function Panel({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={cn('hand-panel mx-4 mt-4 p-5', className)}>{children}</div>;
}

export function Row({
  icon,
  title,
  desc,
}: {
  key?: React.Key;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex gap-3 border-b-[2px] border-[#111]/15 py-3 last:border-b-0">
      <div className="app-chip">
        {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: 'h-5 w-5' })}
      </div>
      <div className="min-w-0">
        <p className="text-lg font-black">{title}</p>
        <p className="line-clamp-2 text-sm font-bold opacity-60">{desc}</p>
      </div>
    </div>
  );
}

export function Empty({ text }: { text: string }) {
  return <p className="py-8 text-center text-sm font-black opacity-55">{text}</p>;
}

export function EmptyScreen({ title }: { title: string }) {
  return (
    <section className="h-full overflow-y-auto pb-8">
      <Header title={title} />
      <Empty text="返回桌面重新选择。" />
    </section>
  );
}

export function Avatar({ character, large }: { character?: Character; large?: boolean }) {
  const size = large ? 'h-24 w-24' : 'h-12 w-12';
  return (
    <div className={cn('flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border-[3px] border-[#111] bg-white', size)}>
      {character?.avatar ? <img src={character.avatar} className="h-full w-full object-cover" /> : <CircleUserRound className="h-1/2 w-1/2 opacity-60" />}
    </div>
  );
}

export function CallButton({
  icon,
  label,
  danger,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
  onClick?: () => void;
}) {
  return (
    <button onClick={onClick} className={cn('call-button', danger ? 'bg-[#ff7b7b]' : 'bg-white')}>
      {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: 'h-5 w-5' })}
      {label}
    </button>
  );
}
