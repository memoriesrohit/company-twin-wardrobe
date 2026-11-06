/** Future integration contracts only. No production adapters implemented in Phase 3A. */
export type AnimationState = 'idle' | 'walking' | 'turning' | 'waving' | 'talking' | 'sitting' | 'working' | 'static' | 'paused';
export interface AvatarConfiguration {
 face: 'round' | 'oval' | 'square'; hair: 'short' | 'bob' | 'curls' | 'bald';
 skin: string; hairColor: string; clothing: 'jacket' | 'shirt' | 'sweater';
 shoes?: 'sneakers' | 'formal' | 'boots';
 color: string; accessory: 'none' | 'glasses' | 'headphones';
}
export interface CharacterRecord {
 schemaVersion: 1; characterId: string; employeeId: string;
 avatarConfiguration: AvatarConfiguration; assetReference: string; animationState: AnimationState;
}
/** Receives approved render data only, never tokens, membership or organizational records. */
export interface CharacterRenderer {
 mount(container: HTMLElement): void;
 setAppearance(config: AvatarConfiguration): void;
 setAnimation(state: AnimationState): void;
 dispose(): void;
}
/** Future GLB/glTF adapter: asset resolver must enforce licensing and authorized URLs externally. */
export interface RiggedAvatarAdapter extends CharacterRenderer {
 loadAsset(asset: {url: string; format: 'glb' | 'gltf'; licenseReference: string}, signal: AbortSignal): Promise<void>;
}
/** Authority remains in existing Phase 2. Browser identity inputs never grant access. */
export interface AuthorizedCharacterRepository {
 load(employeeId: string, signal: AbortSignal): Promise<CharacterRecord>;
 saveAppearance(characterId: string, config: AvatarConfiguration, expectedRevision: string): Promise<CharacterRecord>;
}
/** Optional future synchronization cues; no TTS/provider/voice identity implementation. */
export interface SpeechCue { elapsedSeconds: number; viseme: string; weight: number; }
export interface SpeechAnimationAdapter { applyCue(cue: SpeechCue): void; stop(): void; }
/** Workplace owns units, path planning, collisions, floors and permission checks. */
export interface Placement { environmentId: string; floorId: string; position: [number,number,number]; headingRadians: number; }
export interface WorkplaceCharacterPort { place(characterId: string, placement: Placement): void; remove(characterId: string): void; }
export interface NavigationPort { requestPath(start: Placement, destination: Placement, signal: AbortSignal): Promise<Placement[]>; }
/** Training/Knowledge supply approved content and own access checks; Character has no retrieval authority. */
export interface ModuleCharacterPort { show(record: CharacterRecord, container: HTMLElement): CharacterRenderer; }

/** Movement consumes externally authorized, collision-checked paths. Does not infer floor transitions. */
export interface CharacterMovementPort {
 followPath(points: Placement[], signal: AbortSignal): Promise<void>;
 stop(): void;
}

/** Workplace GLB handoff v1 - proposed wire contract, not a deployed API.
 * Additive: preserves legacy CharacterRecord and appearance storage.
 * Workplace/backend owners must approve before treating this as frozen.
 */
export type WorkplaceClipName = 'Idle' | 'Walk' | 'Sitting' | 'Working' | 'Talking' | 'Waving';
export type WorkplaceMorphName = 'viseme_aa' | 'viseme_E' | 'viseme_O' | 'eyeBlinkLeft' | 'eyeBlinkRight';
export interface WorkplaceAvatarAssetV1 {
 contractVersion: 1;
 assetReference: string; // Stable server-owned reference, never a permanent signed URL.
 assetRevision: string;
 skeletonId: string; // Includes hierarchy, rest pose and bind transforms, not names alone.
 sha256: string;
 byteLength: number;
 licenseReference: string;
 animations: Partial<Record<WorkplaceClipName, string>>; // Missing entries = unsupported.
 facialAnimation: { mode: 'morph-targets' | 'texture-atlas' | 'none'; morphNames: WorkplaceMorphName[] };
 coordinates: { units: 'metres'; up: '+Y'; handedness: 'right'; forward: '+Z' };
}
export interface WorkplaceAvatarBindingV1 {
 contractVersion: 1;
 characterId: string;
 employeeRef: string; // Opaque authoritative backend reference; never an email-derived identity.
 positionRef?: string; // Supplied by the position owner; does not grant permissions.
 assignmentRevision: string;
 asset: WorkplaceAvatarAssetV1;
}
export interface WorkplaceInteractionV1 {
 contractVersion: 1; requestId: string; characterId: string; environmentId: string;
 positionRef?: string; action: 'interact';
 // Existing authorized service must recheck requester and target; event is not permission.
}
export interface WorkplaceSpeechCueV1 {
 contractVersion: 1; utteranceId: string; sequence: number;
 elapsedSeconds: number; // Relative to actual audio playback, not message arrival.
 mouth: 'rest' | 'AA' | 'EE' | 'OO'; weight: number; blink?: number;
}
