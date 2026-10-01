import { useContext } from 'preact/hooks';
import { unitPrefixed } from '../../client/format.mjs';
import { LocaleContext } from '../core/locale/LocaleContext.jsx';
import { Tooltip } from './Tooltip.jsx';

export function DefinitionRow({
  label,
  rowClass = '',
  icon = '',
  help = '',
  definition = {},
  totalBytes,
  children,
}) {
  const { t } = useContext(LocaleContext);
  const field = {
    icon: icon || definition.icon || 'info',
    help: help || definition.help || '',
  };
  return (
    <tr class={rowClass}>
      <th>
        <Tooltip icon={field.icon} label={label} text={field.help}>
          {totalBytes !== undefined && (
            <>
              {t(field.help)}
              <br />
              {t('Total')}: ~{unitPrefixed(totalBytes, true)}B
            </>
          )}
        </Tooltip>
        &nbsp;<span>{t(label)}</span>
      </th>
      <td class="text-right">{children}</td>
    </tr>
  );
}
