import {Tooltip} from './Tooltip.jsx';
export function ShareStatus({encrypted = false, remoteState = ''}) {
    return <>
        {encrypted && <Tooltip icon="lock" label="Encrypted" text="Encrypted" />}
        {remoteState === 'paused' && <Tooltip icon="pause" label="Paused" text="The remote device has paused this folder." />}
        {remoteState === 'notSharing' && <Tooltip icon="triangle-alert" label="Not shared" text="The remote device has not accepted sharing this folder." />}
    </>;
}
