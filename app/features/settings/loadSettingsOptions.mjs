export async function loadSettingsOptions(api, signal) {
  const [upgrade, themes] = await Promise.allSettled([
    api.get('system/upgrade', undefined, signal),
    fetch(new URL('themes.json', location.href), { signal }).then(
      (response) => {
        if (!response.ok) throw new Error('Could not load GUI themes');
        return response.json();
      },
    ),
  ]);
  return {
    upgrade: upgrade.status === 'fulfilled' ? upgrade.value : null,
    themes: themes.status === 'fulfilled' ? themes.value.themes : [],
  };
}
