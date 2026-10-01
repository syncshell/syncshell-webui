import { useContext } from 'preact/hooks';
import { LocaleContext } from '../../core/locale/LocaleContext.jsx';
import data from './about-data.json';
import { aboutPaths } from './about.mjs';
import './AboutPanels.css';

export function AuthorsPanel() {
  const { t } = useContext(LocaleContext);
  return (
    <>
      <h4>{t('The Syncthing Authors')}</h4>
      <p>{data.authors}</p>
    </>
  );
}

export function SoftwarePanel() {
  const { t } = useContext(LocaleContext);
  return (
    <>
      <p>
        Preact · <a href="licenses/preact.txt">MIT license</a>
      </p>
      <p>
        {t('Syncthing includes the following software or portions thereof:')}
      </p>
      <ul class="list-unstyled">
        {data.software.map((software) => (
          <li key={software.url}>
            <a href={software.url} target="_blank" rel="noreferrer">
              {software.name}
            </a>{' '}
            · {software.notice}
          </li>
        ))}
      </ul>
    </>
  );
}

export function PathsPanel({ paths }) {
  const { t } = useContext(LocaleContext);
  return (
    <table class="table table-condensed table-striped about-paths">
      <caption>{t('Internally used paths:')}</caption>
      <tbody>
        {aboutPaths.map(({ label, keys }) => (
          <tr key={label}>
            <th>{t(label)}</th>
            <td>
              {keys.map((key) => (
                <div key={key}>
                  <code class="word-break-all">{paths[key] || ''}</code>
                </div>
              ))}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
