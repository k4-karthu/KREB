import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { scanTextForSlop } from '../scripts/slop-check';

describe('Home Page v3 Rebuild (§11.1 and Part 3 §4)', () => {
  const root = process.cwd();
  const pagePath = path.join(root, 'src/app/page.tsx');
  const searchWidgetPath = path.join(root, 'src/ui/components/HomeSearchWidget.tsx');
  const liveReceiptPath = path.join(root, 'src/ui/components/LiveReceiptSection.tsx');
  const headerPath = path.join(root, 'src/ui/components/SiteHeader.tsx');
  const footerPath = path.join(root, 'src/ui/components/SiteFooter.tsx');

  const pageContent = fs.readFileSync(pagePath, 'utf8');
  const searchWidgetContent = fs.readFileSync(searchWidgetPath, 'utf8');
  const liveReceiptContent = fs.readFileSync(liveReceiptPath, 'utf8');
  const headerContent = fs.readFileSync(headerPath, 'utf8');
  const footerContent = fs.readFileSync(footerPath, 'utf8');

  it('passes slop-check on all home page files with zero violations', () => {
    expect(scanTextForSlop('src/app/page.tsx', pageContent)).toEqual([]);
    expect(scanTextForSlop('src/ui/components/HomeSearchWidget.tsx', searchWidgetContent)).toEqual(
      [],
    );
    expect(scanTextForSlop('src/ui/components/LiveReceiptSection.tsx', liveReceiptContent)).toEqual(
      [],
    );
    expect(scanTextForSlop('src/ui/components/SiteHeader.tsx', headerContent)).toEqual([]);
    expect(scanTextForSlop('src/ui/components/SiteFooter.tsx', footerContent)).toEqual([]);
  });

  it('embeds ShowroomHall, HomeSearchWidget, LiveReceiptSection, and Accordion', () => {
    expect(pageContent).toContain('ShowroomHall');
    expect(pageContent).toContain('HomeSearchWidget');
    expect(pageContent).toContain('LiveReceiptSection');
    expect(pageContent).toContain('Accordion');
  });

  it('contains ZERO native form controls in the search interface', () => {
    // No native select, datetime-local, date inputs
    expect(searchWidgetContent).not.toMatch(/<select\b/);
    expect(searchWidgetContent).not.toMatch(/type=["'](date|datetime-local)["']/);
    // Primitives are imported and used
    expect(searchWidgetContent).toContain('Combobox');
    expect(searchWidgetContent).toContain('DateRangePicker');
    expect(searchWidgetContent).toContain('TimePicker');
    expect(searchWidgetContent).toContain('Button');
  });

  it('integrates live interactive receipt preview with ReceiptAnimation', () => {
    expect(liveReceiptContent).toContain('ReceiptAnimation');
    expect(liveReceiptContent).toContain('quote2DayHatchback');
    expect(liveReceiptContent).toContain('Pricing transparency');
  });

  it('uses clean Accordion for FAQ without native <details>', () => {
    expect(pageContent).not.toMatch(/<details\b/);
    expect(pageContent).toContain('FAQ_ITEMS');
    expect(pageContent).toContain('<Accordion items={FAQ_ITEMS}');
  });

  it('features display-xl typography with Bricolage Grotesque', () => {
    expect(pageContent).toContain('font-display');
    expect(pageContent).toContain(
      'Cars that are genuinely free on your dates, priced to the last rupee.',
    );
  });
});
