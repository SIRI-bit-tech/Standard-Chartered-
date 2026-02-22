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
    <div className="bg-white rounded-xl p-4 sm:p-6 border shadow-sm" style={{ borderColor: colors.border }}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
          <Avatar className="h-20 w-20 border-2 border-white shadow-sm">
            {profile_picture_url ? <AvatarImage src={profile_picture_url} alt={`${first_name} ${last_name}`} /> : null}
            <AvatarFallback className="text-xl bg-primary/5 text-primary">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold truncate" style={{ color: colors.textPrimary }}>
              {first_name} {last_name}
            </h2>
            <p className="text-sm truncate" style={{ color: colors.textSecondary }}>{email}</p>
            {created_at ? (
              <p className="text-xs mt-1" style={{ color: colors.gray500 }}>
                Member since {new Date(created_at).toLocaleDateString()}
              </p>
            ) : null}
          </div>
        </div>
        {rightContent ? (
          <div className="shrink-0 flex justify-center sm:justify-end">
            {rightContent}
          </div>
        ) : null}
      </div>
    </div>
  )
}
