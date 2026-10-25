export function dashboardDestination(metric:string,tournamentId=''){
 const event=tournamentId?`?tournament_id=${encodeURIComponent(tournamentId)}`:'';
 if(['newMembers','cumulativeMembers','activeMembers','membershipPayments'].includes(metric))return '/club-admin/members';
 if(['registrations','confirmed','pending','tournamentPayments'].includes(metric))return '/club-admin/tournament-registrations'+event;
 if(['events','upcoming','completed'].includes(metric))return '/club-admin/tournaments';
 if(['enquiries','awaitingAction'].includes(metric))return '/club-admin/enquiries';
 return '/club-admin/absences';
}
