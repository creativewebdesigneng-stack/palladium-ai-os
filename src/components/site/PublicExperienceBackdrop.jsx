import BlackstarExperienceField from '@/components/blackstar/BlackstarExperienceField'

export default function PublicExperienceBackdrop({
  room = 'astra-room-core',
  visualStyle = 'blackstar-style-cosmic-core',
  wash = true,
}) {
  return (
    <>
      <div className="fixed inset-0 -z-20">
        <BlackstarExperienceField room={room} visualStyle={visualStyle} />
      </div>
      {wash ? (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_50%_-8%,rgba(255,255,255,.025),transparent_30%),linear-gradient(180deg,rgba(0,0,0,.02),rgba(0,0,0,.28)_68%,rgba(0,0,0,.48))]"
        />
      ) : null}
    </>
  )
}
