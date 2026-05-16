import { afterEach, describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Header } from '../Header';

afterEach(cleanup);

describe('Header', () => {
  it('1.2a: schema toggle starts disabled when projectUri === null', () => {
    render(
      <Header
        activeSchema="db"
        displayMode="just-names"
        projectUri={null}
        onFileLoad={vi.fn()}
        onSchemaChange={vi.fn()}
        onDisplayModeChange={vi.fn()}
        onToggleNlPane={vi.fn()}
        onDirPick={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: 'db' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'er' })).toBeDisabled();
  });

  it('1.2a: schema toggle becomes enabled after projectUri is set', () => {
    render(
      <Header
        activeSchema="db"
        displayMode="just-names"
        projectUri="file:///x"
        onFileLoad={vi.fn()}
        onSchemaChange={vi.fn()}
        onDisplayModeChange={vi.fn()}
        onToggleNlPane={vi.fn()}
        onDirPick={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: 'db' })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: 'er' })).not.toBeDisabled();
  });

  it('1.2b: clicking er button fires onSchemaChange with er', () => {
    const onSchemaChange = vi.fn();
    render(
      <Header
        activeSchema="db"
        displayMode="just-names"
        projectUri="file:///x"
        onFileLoad={vi.fn()}
        onSchemaChange={onSchemaChange}
        onDisplayModeChange={vi.fn()}
        onToggleNlPane={vi.fn()}
        onDirPick={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'er' }));
    expect(onSchemaChange).toHaveBeenCalledExactlyOnceWith('er');
  });

  it('1.2c: display-mode toggle reflects active schema displayMode', () => {
    render(
      <Header
        activeSchema="db"
        displayMode="with-constraints"
        projectUri="file:///x"
        onFileLoad={vi.fn()}
        onSchemaChange={vi.fn()}
        onDisplayModeChange={vi.fn()}
        onToggleNlPane={vi.fn()}
        onDirPick={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: 'with constraints' })).toHaveClass('text-sky-500');
    expect(screen.getByRole('button', { name: 'just names' })).not.toHaveClass('text-sky-500');
    expect(screen.getByRole('button', { name: 'with types' })).not.toHaveClass('text-sky-500');
  });

  it('1.2d: read-only badge is always visible regardless of projectUri', () => {
    const { unmount } = render(
      <Header
        activeSchema="db"
        displayMode="just-names"
        projectUri={null}
        onFileLoad={vi.fn()}
        onSchemaChange={vi.fn()}
        onDisplayModeChange={vi.fn()}
        onToggleNlPane={vi.fn()}
        onDirPick={vi.fn()}
      />
    );
    expect(screen.getByText(/read-only/i)).toBeInTheDocument();
    unmount();

    render(
      <Header
        activeSchema="db"
        displayMode="just-names"
        projectUri="file:///x"
        onFileLoad={vi.fn()}
        onSchemaChange={vi.fn()}
        onDisplayModeChange={vi.fn()}
        onToggleNlPane={vi.fn()}
        onDirPick={vi.fn()}
      />
    );
    expect(screen.getByText(/read-only/i)).toBeInTheDocument();
  });

  it('1.2e: NL-pane toggle button is present and fires onToggleNlPane', () => {
    const onToggleNlPane = vi.fn();
    render(
      <Header
        activeSchema="db"
        displayMode="just-names"
        projectUri="file:///x"
        onFileLoad={vi.fn()}
        onSchemaChange={vi.fn()}
        onDisplayModeChange={vi.fn()}
        onToggleNlPane={onToggleNlPane}
        onDirPick={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /nl/i }));
    expect(onToggleNlPane).toHaveBeenCalledOnce();
  });

  it('1.2f: file input has webkitdirectory attribute for folder upload', () => {
    render(
      <Header
        activeSchema="db"
        displayMode="just-names"
        projectUri="file:///x"
        onFileLoad={vi.fn()}
        onSchemaChange={vi.fn()}
        onDisplayModeChange={vi.fn()}
        onToggleNlPane={vi.fn()}
        onDirPick={vi.fn()}
      />
    );
    const fileInput = screen.getByRole('button', { name: 'Load Project Folder' }).previousSibling as HTMLInputElement;
    expect(fileInput).toHaveAttribute('webkitdirectory');
  });
});