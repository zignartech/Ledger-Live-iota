import * as React from "react";

type Props = { width?: number | string; height?: number | string; color?: string };

function LedgerLiveRegular({
  width = 155,
  height = 32,
  color = "currentColor",
}: Props): JSX.Element {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 155 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M141.239 29.9849V32H154.998V22.9137H152.993V29.9849H141.239ZM141.239 0V2.01461H152.993V9.08631H154.998V0H141.239ZM134.598 16.8689H140.652V15.0522H134.598V10.9035H141.242V9.08679H132.593V22.9137H141.537V21.097H134.598V16.8689ZM126.362 22.9137L130.333 9.08631H128.287L125.123 20.6615H124.848L121.821 9.08631H119.718L123.571 22.9137H126.362ZM117.557 9.08631H108.909V10.8643H112.231V21.1357H108.909V22.9137H117.557V21.1357H114.236V10.8643H117.557V9.08631ZM99.4157 9.08631H97.4105V22.9137H106.452V21.097H99.4157V9.08631ZM93.1838 16.9875H86.109V18.8042H93.1852L93.1838 16.9875ZM75.3969 15.5853V10.9035H78.5404C80.0736 10.9035 80.624 11.4174 80.624 12.8196V13.6495C80.624 15.0914 80.0931 15.5853 78.5404 15.5853H75.3969ZM80.3895 16.4147C81.8242 16.0394 82.8266 14.6937 82.8266 13.0964C82.8266 12.0886 82.4336 11.1803 81.6849 10.4493C80.7415 9.54096 79.4833 9.08631 77.852 9.08631H73.4279V22.9137H75.3935V17.402H78.343C79.8562 17.402 80.4656 18.034 80.4656 19.614V22.9127H82.4707V19.931C82.4707 17.7581 81.9593 16.9282 80.3871 16.6911L80.3895 16.4147ZM63.8408 16.8689H69.8948V15.0522H63.8408V10.9035H70.4846V9.08679H61.8362V22.9137H70.7796V21.097H63.8408V16.8689ZM57.2565 17.5999V18.5493C57.2565 20.5443 56.5291 21.1964 54.7009 21.1964H54.2685C52.4408 21.1964 51.5569 20.6036 51.5569 17.858V14.1429C51.5569 11.3777 52.4808 10.805 54.3085 10.805H54.7014C56.4901 10.805 57.0605 11.4767 57.08 13.3331H59.2421C59.0456 10.608 57.237 8.88695 54.5249 8.88695C53.2077 8.88695 52.1073 9.30192 51.2815 10.0917C50.0446 11.2572 49.3553 13.2327 49.3553 15.9979C49.3553 18.6646 49.9452 20.64 51.163 21.8648C51.9889 22.6747 53.1287 23.1078 54.249 23.1078C55.4283 23.1078 56.5096 22.6335 57.06 21.6066H57.335V22.9103H59.1427V15.7827H53.8147V17.5994L57.2565 17.5999ZM39.9195 10.9035H42.0603C44.0849 10.9035 45.1857 11.4174 45.1857 14.1826V17.816C45.1857 20.5812 44.0849 21.0946 42.0603 21.0946H39.9195V10.9035ZM42.2391 22.9137C45.9935 22.9137 47.3887 20.0491 47.3887 15.9998C47.3887 11.8912 45.895 9.08631 42.1996 9.08631H37.9544V22.9137H42.2391ZM28.4605 16.8689H34.5145V15.0522H28.4605V10.9035H35.1044V9.08679H26.4559V22.9137H35.3993V21.097H28.4605V16.8689ZM15.7832 9.08631H13.7786V22.9137H22.82V21.097H15.7832V9.08631ZM0 22.9137V32H13.7586V29.9849H2.00466V22.9137H0ZM0 0V9.08631H2.00466V2.01461H13.7586V0H0Z"
        fill={color}
      />
    </svg>
  );
}

export default LedgerLiveRegular;
