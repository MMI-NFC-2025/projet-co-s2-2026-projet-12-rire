import PocketBase from 'pocketbase';

const pb = new PocketBase('https://rire.maheyralambo.fun:443');

// ============================================
// AUTHENTIFICATION
// ============================================

export async function signup(data) {
	const newUser = await pb.collection('users').create(data);
	return newUser;
}

export async function login(email, password) {
	const authData = await pb.collection('users').authWithPassword(email, password);
	return authData;
}

export function logout() {
	pb.authStore.clear();
}

export function currentUser() {
	return pb.authStore.record;
}

export function isAuthValid() {
	return pb.authStore.isValid;
}

// ============================================
// USERS
// ============================================

export async function oneUser(id) {
	const record = await pb.collection('users').getOne(id);
	return record;
}

export async function allFamilles() {
	const records = await pb.collection('users').getFullList({
		filter: 'type = "famille"',
	});
	return records;
}

export async function allEtudiants() {
	const records = await pb.collection('users').getFullList({
		filter: 'type = "etudiant"',
	});
	return records;
}

// ============================================
// MISSIONS
// ============================================

export async function allMissions() {
	const records = await pb.collection('mission').getFullList({
		sort: '-dateSouhaitee',
		expand: 'famille,etudiantChoisi',
	});
	return records;
}

export async function oneMission(id) {
	const record = await pb.collection('mission').getOne(id, {
		expand: 'famille,etudiantChoisi',
	});
	return record;
}

export async function allMissionsOuvertes() {
	const records = await pb.collection('mission').getFullList({
		filter: 'statut = "ouverte"',
		sort: '-dateSouhaitee',
		expand: 'famille',
	});
	return records;
}

export async function missionsByVille(ville) {
	const records = await pb.collection('mission').getFullList({
		filter: `lieuVille = "${ville}" && statut = "ouverte"`,
		sort: '-dateSouhaitee',
		expand: 'famille',
	});
	return records;
}

export async function missionsByFamille(familleId) {
	const records = await pb.collection('mission').getFullList({
		filter: `famille = "${familleId}"`,
		sort: '-created',
		expand: 'etudiantChoisi',
	});
	return records;
}

export async function missionsByEtudiant(etudiantId) {
	const records = await pb.collection('mission').getFullList({
		filter: `etudiantChoisi = "${etudiantId}"`,
		sort: '-dateSouhaitee',
		expand: 'famille',
	});
	return records;
}

export async function newMission(data) {
	const created = await pb.collection('mission').create(data);
	return created;
}

export async function updateMission(id, data) {
	const updated = await pb.collection('mission').update(id, data);
	return updated;
}

export async function changeMissionStatut(id, newStatut) {
	const updated = await pb.collection('mission').update(id, { statut: newStatut });
	return updated;
}

export async function deleteMission(id) {
	await pb.collection('mission').delete(id);
}

// ============================================
// CANDIDATURES
// ============================================

export async function candidaturesByMission(missionId) {
	const records = await pb.collection('candidature').getFullList({
		filter: `mission = "${missionId}"`,
		sort: '-created',
		expand: 'etudiant',
	});
	return records;
}

export async function candidaturesByEtudiant(etudiantId) {
	const records = await pb.collection('candidature').getFullList({
		filter: `etudiant = "${etudiantId}"`,
		sort: '-created',
		expand: 'mission',
	});
	return records;
}

export async function newCandidature(data) {
	const created = await pb.collection('candidature').create(data);
	return created;
}

export async function acceptCandidature(candidatureId) {
	// 1. Récupérer la candidature pour connaître la mission et l'étudiant
	const candidature = await pb.collection('candidature').getOne(candidatureId);

	// 2. Marquer cette candidature comme acceptée
	await pb.collection('candidature').update(candidatureId, { statut: 'acceptee' });

	// 3. Refuser toutes les autres candidatures de la même mission
	const autresCandidatures = await pb.collection('candidature').getFullList({
		filter: `mission = "${candidature.mission}" && id != "${candidatureId}"`,
	});
	for (const c of autresCandidatures) {
		await pb.collection('candidature').update(c.id, { statut: 'refusee' });
	}

	// 4. Assigner l'étudiant à la mission et passer la mission en "attribuee"
	await pb.collection('mission').update(candidature.mission, {
		etudiantChoisi: candidature.etudiant,
		statut: 'attribuee',
	});

	return true;
}

export async function refuseCandidature(id) {
	const updated = await pb.collection('candidature').update(id, { statut: 'refusee' });
	return updated;
}

// ============================================
// VISITES (check-in / check-out)
// ============================================

export async function checkinMission(missionId, etudiantId) {
	const newVisite = await pb.collection('visite').create({
		mission: missionId,
		etudiant: etudiantId,
		checkinAt: new Date().toISOString(),
		statut: 'en_cours',
	});
	await pb.collection('mission').update(missionId, { statut: 'en_cours' });
	return newVisite;
}

export async function checkoutVisite(visiteId, notes = '') {
	const visite = await pb.collection('visite').getOne(visiteId);
	const updated = await pb.collection('visite').update(visiteId, {
		checkoutAt: new Date().toISOString(),
		notesEtudiant: notes,
		statut: 'terminee',
	});
	await pb.collection('mission').update(visite.mission, { statut: 'terminee' });
	return updated;
}

export async function visitesByMission(missionId) {
	const records = await pb.collection('visite').getFullList({
		filter: `mission = "${missionId}"`,
		sort: '-checkinAt',
	});
	return records;
}

// ============================================
// AVIS
// ============================================

export async function avisByEtudiant(etudiantId) {
	const records = await pb.collection('avis').getFullList({
		filter: `cible = "${etudiantId}" && type = "famille_vers_etudiant"`,
		sort: '-created',
	});
	return records;
}

export async function avisByFamille(familleId) {
	const records = await pb.collection('avis').getFullList({
		filter: `cible = "${familleId}" && type = "etudiant_vers_famille"`,
		sort: '-created',
	});
	return records;
}

export async function newAvis(data) {
	const created = await pb.collection('avis').create(data);
	return created;
}

// ============================================
// Export du client (utile pour des cas spécifiques)
// ============================================
export async function updateUser(id, data) {
	return await pb.collection('users').update(id, data);
}
export async function deleteUser(id) {
	await pb.collection('users').delete(id);
}
export async function userStats(userId) {
	const mEtu = await pb.collection('mission').getFullList({ filter: `etudiantChoisi = "${userId}" && statut = "terminee"` });
	const mFam = await pb.collection('mission').getFullList({ filter: `famille = "${userId}" && statut = "terminee"` });
	const avis = await pb.collection('avis').getFullList({ filter: `cible = "${userId}"`, sort: '-created', expand: 'auteur' });
	return {
		missionsTerminees: mEtu.length + mFam.length,
		nbAvis: avis.length,
		noteMoyenne: avis.length ? avis.reduce((s, a) => s + a.note, 0) / avis.length : null,
		avisRecus: avis,
	};
}
export async function missionsFiltrees({ ville, type, tarifMin } = {}) {
	const f = ['statut = "ouverte"'];
	if (ville) f.push(`lieuVille ~ "${ville}"`);
	if (type) f.push(`type = "${type}"`);
	if (tarifMin) f.push(`tarifHoraire >= ${tarifMin}`);
	return await pb.collection('mission').getFullList({ filter: f.join(' && '), sort: '-dateSouhaitee', expand: 'famille' });
}
export async function newSignalement(data) {
	return await pb.collection('signalement').create(data);
}
export async function avisExistant(missionId, auteurId) {
	const r = await pb.collection('avis').getFullList({ filter: `mission = "${missionId}" && auteur = "${auteurId}"` });
	return r[0] || null;
}
export { pb };