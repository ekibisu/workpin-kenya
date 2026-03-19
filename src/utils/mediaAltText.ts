export function generateAltText(
  fileName: string,
  context: string,
  providerName?: string,
  serviceTitle?: string
): string {
  if (serviceTitle) {
    if (context === 'hero' || context === 'cover') return `${serviceTitle} - service overview`;
    return `Photo from ${serviceTitle}`;
  }

  if (providerName) {
    const patterns: Record<string, string> = {
      logo: `${providerName} logo`,
      'profile-photo': `${providerName} profile photo`,
      hero: `${providerName} - featured image`,
      portfolio: `Portfolio work by ${providerName}`,
      gallery: `${providerName} - gallery photo`,
    };
    return patterns[context] ?? `${providerName} - ${context} image`;
  }

  // Fallback: humanize the filename
  const clean = fileName.replace(/[-_]/g, ' ').replace(/\.\w+$/, '');
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}
