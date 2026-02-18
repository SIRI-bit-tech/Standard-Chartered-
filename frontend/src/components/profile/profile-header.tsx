import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getInitials } from "@/lib/utils"
import { colors } from "@/types"

interface Props {
  first_name: string
  last_name: string
  email: string
  created_at?: string
  profile_picture_url?: string | null
  rightContent?: React.ReactNode
}

export function ProfileHeader({ first_name, last_name, email, created_at, profile_picture_url, rightContent }: Props) {
  const initials = getInitials(first_name, last_name)
  return (
    <div className="bg-white rounded-xl p-6 border" style={{ borderColor: colors.border }}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          {profile_picture_url ? <AvatarImage src={profile_picture_url} alt={`${first_name} ${last_name}`} /> : null}
          <AvatarFallback className="text-lg">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h2 className="text-xl font-semibold" style={{ color: colors.textPrimary }}>
            {first_name} {last_name}
          </h2>
          <p className="text-sm" style={{ color: colors.textSecondary }}>{email}</p>
          {created_at ? (
            <p className="text-xs mt-1" style={{ color: colors.gray500 }}>
              Joined {new Date(created_at).toLocaleDateString()}
            </p>
          ) : null}
        </div>
        </div>
        {rightContent ? <div className="shrink-0">{rightContent}</div> : null}
      </div>
    </div>
  )
}
