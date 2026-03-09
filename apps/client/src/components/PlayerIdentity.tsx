import type { PublicPlayer } from '@ito/shared';

export const AVAILABLE_PLAYER_ICONS = ['icon1', 'icon2', 'icon3', 'icon4', 'icon5', 'icon6', 'icon7', 'icon8', 'icon9', 'icon10', 'icon11', 'icon12'] as const;
export type PlayerIconId = (typeof AVAILABLE_PLAYER_ICONS)[number];

export function iconSrc(playerIconId: string): string {
  return `/${playerIconId}.png`;
}

export function PlayerIcon({ playerIconId, size = 22 }: { playerIconId: string; size?: number }) {
  return (
    <span
      className="player-icon-circle"
      style={{ width: size + 8, height: size + 8 }}
      aria-hidden="true"
    >
      <img
        src={iconSrc(playerIconId)}
        alt=""
        className="player-icon-image"
        style={{ width: size, height: size }}
      />
    </span>
  );
}

export function PlayerIdentity({
  player,
  className,
}: {
  player: Pick<PublicPlayer, 'name' | 'playerIconId'>;
  className?: string;
}) {
  return (
    <span className={className ? `player-identity ${className}` : 'player-identity'}>
      <PlayerIcon playerIconId={player.playerIconId} />
      <span className="player-identity-name">{player.name}</span>
    </span>
  );
}
