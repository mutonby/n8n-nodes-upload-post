import { Buffer } from 'buffer';
import {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IRequestOptions,
	NodeConnectionType
} from 'n8n-workflow';

export class UploadPost implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Upload Post',
		name: 'uploadPost',
		icon: 'file:UploadPost.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Upload content to social media via Upload-Post API',
		defaults: {
			name: 'Upload Post',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'uploadPostApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Upload', value: 'uploads' },
					{ name: 'Status & History', value: 'monitoring' },
					{ name: 'User', value: 'users' },
				],
				default: 'uploads',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Upload Photo(s)', value: 'uploadPhotos', action: 'Upload photos', description: 'Upload one or more photos (Supports: TikTok, Instagram, LinkedIn, Facebook, X, Threads)' },
					{ name: 'Upload Text', value: 'uploadText', action: 'Upload a text post', description: 'Upload a text-based post (Supports: X, LinkedIn, Facebook, Threads)' },
					{ name: 'Upload Video', value: 'uploadVideo', action: 'Upload a video', description: 'Upload a single video (Supports: TikTok, Instagram, LinkedIn, YouTube, Facebook, X, Threads)' },
				],
				default: 'uploadPhotos',
				displayOptions: { show: { resource: ['uploads'] } },
			},
			// Operations for Status & History
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Get Upload History', value: 'getHistory', action: 'Get upload history', description: 'List past uploads with optional filters' },
					{ name: 'Get Upload Status', value: 'getStatus', action: 'Get upload status', description: 'Check the status of an upload using the request_id' },
				],
				default: 'getStatus',
				displayOptions: { show: { resource: ['monitoring'] } },
			},
			// Operations for Users
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Create User', value: 'createUser', action: 'Create user', description: 'Create a new Upload-Post user (profile name)' },
					{ name: 'Delete User', value: 'deleteUser', action: 'Delete user', description: 'Delete an existing Upload-Post user by profile name' },
					{ name: 'Generate JWT (for Platform Integration)', value: 'generateJwt', action: 'Generate jwt for platform integration', description: 'Generate a connection URL (JWT) for a profile. Only needed when integrating Upload-Post into your own platform.' },
					{ name: 'List Users', value: 'listUsers', action: 'List users', description: 'List Upload-Post users (profiles)' },
					{ name: 'Validate JWT (for Platform Integration)', value: 'validateJwt', action: 'Validate jwt for platform integration', description: 'Validate a connection token from your backend. Only needed for custom platform integration.' },
				],
				default: 'listUsers',
				displayOptions: { show: { resource: ['users'] } },
			},
			// (Removed separate JWT resource; JWT operations are under Users below)

		// Common Fields for all operations
			{
				displayName: 'User Identifier',
				name: 'user',
				type: 'string',
				required: true,
				default: '',
				description: 'The Profile Name you created in your upload-post.com account. You can find it in the \'Manage Users\' section (e.g., app.upload-post.com/manage-users).',
				displayOptions: {
					show: {
						resource: ['uploads','users'],
						operation: ['uploadPhotos','uploadVideo','uploadText','generateJwt']
					}
				},
			},
			{
				displayName: 'Platform(s)',
				name: 'platform',
				type: 'multiOptions',
				required: true,
				options: [
					{ name: 'Facebook', value: 'facebook' },
					{ name: 'Instagram', value: 'instagram' },
					{ name: 'LinkedIn', value: 'linkedin' },
					{ name: 'Pinterest', value: 'pinterest' },
					{ name: 'Threads', value: 'threads' },
					{ name: 'TikTok', value: 'tiktok' },
					{ name: 'X (Twitter)', value: 'x' },
					{ name: 'YouTube', value: 'youtube' },
				],
				default: [],
				description: 'Platform(s) to upload to. Supported platforms vary by operation.',
				displayOptions: { show: { resource: ['uploads'], operation: ['uploadPhotos','uploadVideo','uploadText'] } },
			},
			{
				displayName: 'Pinterest Board ID',
				name: 'pinterestBoardId',
				type: 'string',
				default: '',
				description: 'Target Pinterest board ID. Required when Pinterest is selected.',
				displayOptions: {
					show: {
						resource: ['uploads'],
						platform: ['pinterest']
					},
				},
			},
			{
				displayName: 'Title / Main Content',
				name: 'title',
				type: 'string',
				required: true,
				default: '',
				description: 'Title of the post. For Upload Text, this is the main text content. For some video platforms, this acts as a fallback for description if a specific description is not provided.',
				displayOptions: { show: { resource: ['uploads'], operation: ['uploadPhotos','uploadVideo','uploadText'] } },
			},
			{
				displayName: 'Scheduled Date',
				name: 'scheduledDate',
				type: 'dateTime',
				default: '',
				description: 'Optional scheduling date/time. If set, the API will schedule the publication instead of posting immediately.',
				displayOptions: { show: { resource: ['uploads'], operation: ['uploadPhotos','uploadVideo','uploadText'] } },
			},
			{
				displayName: 'Upload Asynchronously',
				name: 'uploadAsync',
				type: 'boolean',
				default: true,
				description: 'Whether to process the upload asynchronously and return immediately. If you set to false but the upload takes longer than 59 seconds, it will automatically switch to asynchronous processing to avoid timeouts. In that case, use the request_id with the Upload Status endpoint to check the upload status and result.',
				displayOptions: {
					show: {
						operation: ['uploadPhotos','uploadVideo','uploadText']
					}
				},
			},
			{
				displayName: 'Wait for Completion',
				name: 'waitForCompletion',
				type: 'boolean',
				default: true,
				description: 'Whether to poll the status endpoint until completion or timeout when the upload is processed asynchronously',
				displayOptions: {
					show: {
						operation: ['uploadPhotos','uploadVideo','uploadText']
					}
				},
			},
			{
				displayName: 'Poll Interval (Seconds)',
				name: 'pollInterval',
				type: 'number',
				default: 10,
				description: 'How often to poll the status endpoint when waiting for completion',
				displayOptions: {
					show: {
						operation: ['uploadPhotos','uploadVideo','uploadText'],
						waitForCompletion: [true]
					}
				},
			},
			{
				displayName: 'Timeout (Seconds)',
				name: 'pollTimeout',
				type: 'number',
				default: 600,
				description: 'Maximum time to wait before giving up polling',
				displayOptions: {
					show: {
						operation: ['uploadPhotos','uploadVideo','uploadText'],
						waitForCompletion: [true]
					}
				},
			},
			// Fields for Status & History
			{
				displayName: 'Request ID',
				name: 'requestId',
				type: 'string',
				required: true,
				default: '',
				description: 'The request_id returned by an async upload to query its status',
				displayOptions: {
					show: {
						operation: ['getStatus']
					}
				},
			},
			// Removed platform filter (not supported by API)
			// Removed status filter (not supported by API)
			{
				displayName: 'Page',
				name: 'historyPage',
				type: 'number',
				default: 1,
				description: 'Page number for pagination',
				displayOptions: {
					show: {
						operation: ['getHistory']
					}
				},
			},
			{
				displayName: 'Limit',
				name: 'historyLimit',
				type: 'number',
				default: 20,
				description: 'Items per page. Can be 20, 50, or 100.',
				displayOptions: {
					show: {
						operation: ['getHistory']
					}
				},
			},
			// Removed from/to date filters (not supported by API)

			// Create user
			{
				displayName: 'New User Identifier',
				name: 'newUser',
				type: 'string',
				required: true,
				default: '',
				description: 'Profile name to create',
				displayOptions: {
					show: { operation: ['createUser'] }
				},
			},

			// Delete user
			{
				displayName: 'User to Delete',
				name: 'deleteUserId',
				type: 'string',
				required: true,
				default: '',
				description: 'Profile name to delete',
				displayOptions: {
					show: { operation: ['deleteUser'] }
				},
			},

			// Generate JWT
			{
				displayName: 'Redirect URL',
				name: 'redirectUrl',
				type: 'string',
				default: '',
				description: 'Optional URL to redirect the user after linking their social account',
				displayOptions: { show: { operation: ['generateJwt'] } },
			},
			{
				displayName: 'Logo Image URL',
				name: 'logoImage',
				type: 'string',
				default: '',
				description: 'Optional logo image URL to show on the linking page',
				displayOptions: { show: { operation: ['generateJwt'] } },
			},
			{
				displayName: 'Redirect Button Text',
				name: 'redirectButtonText',
				type: 'string',
				default: '',
				description: 'Optional text for the redirect button after linking (default: "Logout connection")',
				displayOptions: { show: { operation: ['generateJwt'] } },
			},
			{
				displayName: 'Platforms (Optional)',
				name: 'jwtPlatforms',
				type: 'multiOptions',
				options: [
					{ name: 'Facebook', value: 'facebook' },
					{ name: 'Instagram', value: 'instagram' },
					{ name: 'LinkedIn', value: 'linkedin' },
					{ name: 'Threads', value: 'threads' },
					{ name: 'TikTok', value: 'tiktok' },
					{ name: 'X (Twitter)', value: 'x' },
					{ name: 'YouTube', value: 'youtube' },
				],
				default: [],
				description: 'Optional list of platforms to show for connection. Defaults to all supported platforms.',
				displayOptions: { show: { operation: ['generateJwt'] } },
			},

			// Validate JWT
			{
				displayName: 'JWT',
				name: 'jwtToken',
				type: 'string',
				typeOptions: { password: true },
				required: true,
				default: '',
				description: 'JWT to validate',
				displayOptions: { show: { operation: ['validateJwt'] } },
			},

		// Fields for Upload Photo(s)
			{
				displayName: 'Photos (Files or URLs)',
				name: 'photos',
				type: 'string',
				required: true,
				default: '',
				description: 'Provide photo files or URLs as a comma-separated list (e.g., data,https://example.com/image.jpg,otherImage). For files, enter the binary property name (e.g., data, myImage). For URLs, provide direct HTTP/HTTPS URLs.',
				displayOptions: {
					show: {
						operation: ['uploadPhotos'],
					},
				},
			},
			{
				displayName: 'Caption (Photo/Video Commentary)',
				name: 'caption',
				type: 'string',
				default: '',
				description: 'General caption/commentary for Photo or Video posts. For some video platforms, a specific \'Description\' field might be used instead (see platform-specific options). Not used for Upload Text.',
				displayOptions: {
					show: {
						operation: ['uploadPhotos', 'uploadVideo'],
					},
				},
			},

		// Fields for Upload Video
			{
				displayName: 'Video (File or URL)',
				name: 'video',
				type: 'string',
				required: true,
				default: '',
				description: 'The video file to upload or a video URL. For files, enter the binary property name (e.g., data).',
				displayOptions: {
					show: {
						operation: ['uploadVideo'],
					},
				},
			},

		// ----- LinkedIn Specific Parameters ----- 
			{
				displayName: 'LinkedIn Visibility',
				name: 'linkedinVisibility',
				type: 'options',
				options: [
					{ name: 'Public', value: 'PUBLIC' },
					{ name: 'Connections', value: 'CONNECTIONS'},
					{ name: 'Logged In', value: 'LOGGED_IN', displayOptions: { show: { operation: ['uploadVideo'] } } },
					{ name: 'Container', value: 'CONTAINER', displayOptions: { show: { operation: ['uploadVideo'] } } },
				],
				default: 'PUBLIC',
				description: 'Visibility for LinkedIn. For Photos, only PUBLIC is supported by API. For Video, CONNECTIONS, PUBLIC, LOGGED_IN, CONTAINER. Not used for Upload Text.',
				displayOptions: {
					show: {
						operation: ['uploadPhotos', 'uploadVideo'],
						platform: ['linkedin']
					},
				},
			},
			{
				displayName: 'Target LinkedIn Page ID',
				name: 'targetLinkedinPageId',
				type: 'string',
				default: '',
				description: 'LinkedIn page ID to upload to an organization (optional). Used for Photos, Video, and Text operations.',
				displayOptions: {
					show: {
						operation: ['uploadPhotos', 'uploadVideo', 'uploadText'],
						platform: ['linkedin']
					},
				},
			},
			{
				displayName: 'LinkedIn Video Description',
				name: 'linkedinDescription',
				type: 'string',
				default: '',
				description: 'User commentary for LinkedIn Video. If not provided, Title is used. Not for Photos/Text.',
				displayOptions: {
					show: {
						operation: ['uploadVideo'],
						platform: ['linkedin']
					},
				},
			},

		// ----- Facebook Specific Parameters ----- 
			{
				displayName: 'Facebook Page ID',
				name: 'facebookPageId',
				type: 'string',
				required: true,
				default: '',
				description: 'Facebook Page ID. Required for Photos, Video, and Text operations.',
				displayOptions: {
					show: {
						operation: ['uploadPhotos', 'uploadVideo', 'uploadText'],
						platform: ['facebook']
					},
				},
			},
			{
				displayName: 'Facebook Link (Text)',
				name: 'facebookLink',
				type: 'string',
				default: '',
				description: 'URL to attach to the Facebook text post as a link preview. Only for Upload Text.',
				displayOptions: {
					show: {
						operation: ['uploadText'],
						platform: ['facebook']
					},
				},
			},
			{
				displayName: 'Facebook Video Description',
				name: 'facebookVideoDescription',
				type: 'string',
				default: '',
				description: 'Description for Facebook Video. If not provided, Title is used. Not for Photos/Text.',
				displayOptions: {
					show: {
						operation: ['uploadVideo'],
						platform: ['facebook']
					},
				},
			},
			{
				displayName: 'Facebook Video State',
				name: 'facebookVideoState',
				type: 'options',
				options: [
					{ name: 'Published', value: 'PUBLISHED' },
					{ name: 'Draft', value: 'DRAFT' },
					{ name: 'Scheduled', value: 'SCHEDULED' },
				],
				default: 'PUBLISHED',
				description: 'State for Facebook Video (DRAFT, PUBLISHED, SCHEDULED). Not for Photos/Text.',
				displayOptions: {
					show: {
						operation: ['uploadVideo'],
						platform: ['facebook']
					},
				},
			},

		// ----- TikTok Specific Parameters -----
			{
				displayName: 'TikTok Auto Add Music (Photo)',
				name: 'tiktokAutoAddMusic',
				type: 'boolean',
				default: false,
				description: 'Whether to auto add music to TikTok photos. Only for Upload Photos.',
				displayOptions: {
					show: {
						operation: ['uploadPhotos'],
						platform: ['tiktok']
					},
				},
			},
			{
				displayName: 'TikTok Disable Comment',
				name: 'tiktokDisableComment',
				type: 'boolean',
				default: false,
				description: 'Whether to disable comments on TikTok post. For Photos & Video.',
				displayOptions: {
					show: {
						operation: ['uploadPhotos', 'uploadVideo'],
						platform: ['tiktok']
					},
				},
			},
			{
				displayName: 'TikTok Branded Content (Photo)',
				name: 'tiktokBrandedContentPhoto',
				type: 'boolean',
				default: false,
				description: 'Whether to indicate photo post is branded content (requires Disclose Commercial). Only for Upload Photos.',
				displayOptions: {
					show: {
						operation: ['uploadPhotos'],
						platform: ['tiktok']
					},
				},
			},
			{
				displayName: 'TikTok Disclose Commercial (Photo)',
				name: 'tiktokDiscloseCommercialPhoto',
				type: 'boolean',
				default: false,
				description: 'Whether to disclose commercial nature of photo post. Only for Upload Photos.',
				displayOptions: {
					show: {
						operation: ['uploadPhotos'],
						platform: ['tiktok']
					},
				},
			},
			{
				displayName: 'TikTok Photo Cover Index',
				name: 'tiktokPhotoCoverIndex',
				type: 'number',
				default: 0,
				typeOptions: { minValue: 0 },
				description: 'Index (0-based) of photo to use as cover for TikTok photo post. Only for Upload Photos.',
				displayOptions: {
					show: {
						operation: ['uploadPhotos'],
						platform: ['tiktok']
					},
				},
			},
			{
				displayName: 'TikTok Photo Description',
				name: 'tiktokPhotoDescription',
				type: 'string',
				default: '',
				description: 'Description for TikTok photo post. If not provided, Title is used. Only for Upload Photos.',
				displayOptions: {
					show: {
						operation: ['uploadPhotos'],
						platform: ['tiktok']
					},
				},
			},
			{
				displayName: 'TikTok Privacy Level (Video)',
				name: 'tiktokPrivacyLevel',
				type: 'options',
				options: [
					{ name: 'Public to Everyone', value: 'PUBLIC_TO_EVERYONE' },
					{ name: 'Mutual Follow Friends', value: 'MUTUAL_FOLLOW_FRIENDS' },
					{ name: 'Follower of Creator', value: 'FOLLOWER_OF_CREATOR' },
					{ name: 'Self Only', value: 'SELF_ONLY' },
				],
				default: 'PUBLIC_TO_EVERYONE',
				description: 'Privacy setting for TikTok video (PUBLIC_TO_EVERYONE, MUTUAL_FOLLOW_FRIENDS, etc.). Only for Upload Video.',
				displayOptions: {
					show: {
						operation: ['uploadVideo'],
						platform: ['tiktok']
					},
				},
			},
			{
				displayName: 'TikTok Disable Duet (Video)',
				name: 'tiktokDisableDuet',
				type: 'boolean',
				default: false,
				description: 'Whether to disable duet for TikTok video. Only for Upload Video.',
				displayOptions: {
					show: {
						operation: ['uploadVideo'],
						platform: ['tiktok']
					},
				},
			},
			{
				displayName: 'TikTok Disable Stitch (Video)',
				name: 'tiktokDisableStitch',
				type: 'boolean',
				default: false,
				description: 'Whether to disable stitch for TikTok video. Only for Upload Video.',
				displayOptions: {
					show: {
						operation: ['uploadVideo'],
						platform: ['tiktok']
					},
				},
			},
			{
				displayName: 'TikTok Cover Timestamp (Ms, Video)',
				name: 'tiktokCoverTimestamp',
				type: 'number',
				default: 1000,
				description: 'Timestamp (ms) for video cover on TikTok. Only for Upload Video.',
				displayOptions: {
					show: {
						operation: ['uploadVideo'],
						platform: ['tiktok']
					},
				},
			},
			{
				displayName: 'TikTok Brand Content Toggle (Video)',
				name: 'tiktokBrandContentToggle',
				type: 'boolean',
				default: false,
				description: 'Whether to enable branded content for TikTok video. Only for Upload Video.',
				displayOptions: {
					show: {
						operation: ['uploadVideo'],
						platform: ['tiktok']
					},
				},
			},
			{
				displayName: 'TikTok Brand Organic (Video)',
				name: 'tiktokBrandOrganic',
				type: 'boolean',
				default: false,
				description: 'Whether to enable organic branded content for TikTok video. Only for Upload Video.',
				displayOptions: {
					show: {
						operation: ['uploadVideo'],
						platform: ['tiktok']
					},
				},
			},
			{
				displayName: 'TikTok Branded Content (Video)',
				name: 'tiktokBrandedContentVideo',
				type: 'boolean',
				default: false,
				description: 'Whether to enable branded content with disclosure for TikTok video. Only for Upload Video.',
				displayOptions: {
					show: {
						operation: ['uploadVideo'],
						platform: ['tiktok']
					},
				},
			},
			{
				displayName: 'TikTok Brand Organic Toggle (Video)',
				name: 'tiktokBrandOrganicToggle',
				type: 'boolean',
				default: false,
				description: 'Whether to enable organic branded content toggle for TikTok video. Only for Upload Video.',
				displayOptions: {
					show: {
						operation: ['uploadVideo'],
						platform: ['tiktok']
					},
				},
			},
			{
				displayName: 'TikTok Is AIGC (Video)',
				name: 'tiktokIsAigc',
				type: 'boolean',
				default: false,
				description: 'Whether to indicate if content is AI-generated for TikTok video. Only for Upload Video.',
				displayOptions: {
					show: {
						operation: ['uploadVideo'],
						platform: ['tiktok']
					},
				},
			},

		// ----- Instagram Specific Parameters -----
			{
				displayName: 'Instagram Media Type',
				name: 'instagramMediaType',
				type: 'options',
				options: [
					{ name: 'Image (Feed - Photo)', value: 'IMAGE', displayOptions: {show: {operation: ['uploadPhotos']}} },
					{ name: 'Stories (Photo/Video)', value: 'STORIES' },
					{ name: 'Reels (Video)', value: 'REELS', displayOptions: {show: {operation: ['uploadVideo']}} },
				],
				default: 'IMAGE',
				description: 'Type of media for Instagram. IMAGE/STORIES for Photos. REELS/STORIES for Video.',
				displayOptions: {
					show: {
						operation: ['uploadPhotos', 'uploadVideo'],
						platform: ['instagram']
					},
				},
			},
			{
				displayName: 'Instagram Share to Feed (Video)',
				name: 'instagramShareToFeed',
				type: 'boolean',
				default: true,
				description: 'Whether to share Instagram video (Reel/Story) to feed. Only for Upload Video.',
				displayOptions: {
					show: {
						operation: ['uploadVideo'],
						platform: ['instagram']
					},
				},
			},
			{
				displayName: 'Instagram Collaborators (Video)',
				name: 'instagramCollaborators',
				type: 'string',
				default: '',
				description: 'Comma-separated collaborator usernames for Instagram video. Sent as a string. Only for Upload Video.',
				displayOptions: {
					show: {
						operation: ['uploadVideo'],
						platform: ['instagram']
					},
				},
			},
			{
				displayName: 'Instagram Cover URL (Video)',
				name: 'instagramCoverUrl',
				type: 'string',
				default: '',
				description: 'URL for custom video cover on Instagram. Only for Upload Video.',
				displayOptions: {
					show: {
						operation: ['uploadVideo'],
						platform: ['instagram']
					},
				},
			},
			{
				displayName: 'Instagram Audio Name (Video)',
				name: 'instagramAudioName',
				type: 'string',
				default: '',
				description: 'Name of the audio track for Instagram video. Only for Upload Video.',
				displayOptions: {
					show: {
						operation: ['uploadVideo'],
						platform: ['instagram']
					},
				},
			},
			{
				displayName: 'Instagram User Tags (Video)',
				name: 'instagramUserTags',
				type: 'string',
				default: '',
				description: 'Comma-separated user tags for Instagram video. Sent as a string. Only for Upload Video.',
				displayOptions: {
					show: {
						operation: ['uploadVideo'],
						platform: ['instagram']
					},
				},
			},
			{
				displayName: 'Instagram Location ID (Video)',
				name: 'instagramLocationId',
				type: 'string',
				default: '',
				description: 'Instagram location ID for the video. Only for Upload Video.',
				displayOptions: {
					show: {
						operation: ['uploadVideo'],
						platform: ['instagram']
					},
				},
			},
			{
				displayName: 'Instagram Thumb Offset (Video)',
				name: 'instagramThumbOffset',
				type: 'string',
				default: '',
				description: 'Timestamp offset for video thumbnail on Instagram. Only for Upload Video.',
				displayOptions: {
					show: {
						operation: ['uploadVideo'],
						platform: ['instagram']
					},
				},
			},

		// ----- YouTube Specific Parameters (Video Only) -----
			{
				displayName: 'YouTube Video Description',
				name: 'youtubeDescription',
				type: 'string',
				default: '',
				description: 'Description of the video for YouTube. If not provided, Title is used. Only for Upload Video.',
				displayOptions: {
					show: {
						operation: ['uploadVideo'],
						platform: ['youtube']
					},
				},
			},
			{
				displayName: 'YouTube Tags',
				name: 'youtubeTags',
				type: 'string',
				default: '',
				description: 'Comma-separated list of tags for YouTube video. Will be sent as an array. Only for Upload Video.',
				displayOptions: {
					show: {
						operation: ['uploadVideo'],
						platform: ['youtube']
					},
				},
			},
			{
				displayName: 'YouTube Category ID',
				name: 'youtubeCategoryId',
				type: 'string',
				default: '22',
				description: 'Video category ID for YouTube (e.g., 22 for People & Blogs). Only for Upload Video.',
				displayOptions: {
					show: {
						operation: ['uploadVideo'],
						platform: ['youtube']
					},
				},
			},
			{
				displayName: 'YouTube Privacy Status',
				name: 'youtubePrivacyStatus',
				type: 'options',
				options: [
					{ name: 'Public', value: 'public' },
					{ name: 'Unlisted', value: 'unlisted' },
					{ name: 'Private', value: 'private' },
				],
				default: 'public',
				description: 'Privacy setting for YouTube video (public, unlisted, private). Only for Upload Video.',
				displayOptions: {
					show: {
						operation: ['uploadVideo'],
						platform: ['youtube']
					},
				},
			},
			{
				displayName: 'YouTube Embeddable',
				name: 'youtubeEmbeddable',
				type: 'boolean',
				default: true,
				description: 'Whether the YouTube video is embeddable. Only for Upload Video.',
				displayOptions: {
					show: {
						operation: ['uploadVideo'],
						platform: ['youtube']
					},
				},
			},
			{
				displayName: 'YouTube License',
				name: 'youtubeLicense',
				type: 'options',
				options: [
					{ name: 'Standard YouTube License', value: 'youtube' },
					{ name: 'Creative Commons - Attribution', value: 'creativeCommon' },
				],
				default: 'youtube',
				description: 'Video license for YouTube (youtube, creativeCommon). Only for Upload Video.',
				displayOptions: {
					show: {
						operation: ['uploadVideo'],
						platform: ['youtube']
					},
				},
			},
			{
				displayName: 'YouTube Public Stats Viewable',
				name: 'youtubePublicStatsViewable',
				type: 'boolean',
				default: true,
				description: 'Whether public stats are viewable for the YouTube video. Only for Upload Video.',
				displayOptions: {
					show: {
						operation: ['uploadVideo'],
						platform: ['youtube']
					},
				},
			},
			{
				displayName: 'YouTube Made For Kids',
				name: 'youtubeMadeForKids',
				type: 'boolean',
				default: false,
				description: 'Whether the YouTube video is made for kids. Only for Upload Video.',
				displayOptions: {
					show: {
						operation: ['uploadVideo'],
						platform: ['youtube']
					},
				},
			},
			{
				displayName: 'YouTube Thumbnail (File or URL)',
				name: 'youtubeThumbnail',
				type: 'string',
				default: '',
				description: 'Custom thumbnail for YouTube video. Provide a binary property name (e.g., data) or a direct HTTP/HTTPS URL. Only for Upload Video.',
				displayOptions: {
					show: {
						operation: ['uploadVideo'],
						platform: ['youtube']
					},
				},
			},

		// ----- Threads Specific Parameters (Not for Photo) -----
			{
				displayName: 'Threads Video Description',
				name: 'threadsDescription',
				type: 'string',
				default: '',
				description: 'User commentary for Threads video. If not provided, Title is used. Not for Photos/Text.',
				displayOptions: {
					show: {
						operation: ['uploadVideo'],
						platform: ['threads']
					},
				},
			},

		// ----- X (Twitter) Specific Parameters (Video & Text - Not for Photo) -----
			{
				displayName: 'X Tagged User IDs (Video/Text)',
				name: 'xTaggedUserIds',
				type: 'string',
				default: '',
				description: 'Comma-separated list of user IDs to tag for X (Twitter). Not for Photos.',
				displayOptions: {
					show: {
						operation: ['uploadVideo', 'uploadText'],
						platform: ['x']
					},
				},
			},
			{
				displayName: 'X Reply Settings (Video/Text)',
				name: 'xReplySettings',
				type: 'options',
				options: [
					{ name: 'Following', value: 'following' },
					{ name: 'Mentioned Users', value: 'mentionedUsers' },
					{ name: 'Everyone', value: 'everyone' },
				],
				default: 'following',
				description: 'Who can reply to the post on X (Twitter) (following, mentionedUsers, everyone). Not for Photos.',
				displayOptions: {
					show: {
						operation: ['uploadVideo', 'uploadText'],
						platform: ['x']
					},
				},
			},
			{
				displayName: 'X Nullcast (Video)',
				name: 'xNullcastVideo',
				type: 'boolean',
				default: false,
				description: 'Whether to publish X (Twitter) video without broadcasting. Not for Text/Photos.',
				displayOptions: {
					show: {
						operation: ['uploadVideo'],
						platform: ['x']
					},
				},
			},
			{
				displayName: 'X Place ID (Video)',
				name: 'xPlaceIdVideo',
				type: 'string',
				default: '',
				description: 'Location place ID for X (Twitter) video. Not for Text/Photos.',
				displayOptions: {
					show: {
						operation: ['uploadVideo'],
						platform: ['x']
					},
				},
			},
			{
				displayName: 'X Poll Duration (Minutes, Video)',
				name: 'xPollDurationVideo',
				type: 'number',
				default: 1440,
				description: 'Poll duration in minutes for X (Twitter) video post (requires Poll Options). Not for Text/Photos.',
				displayOptions: {
					show: {
						operation: ['uploadVideo'],
						platform: ['x']
					},
				},
			},
			{
				displayName: 'X Poll Options (Video)',
				name: 'xPollOptionsVideo',
				type: 'string',
				default: '',
				description: 'Comma-separated list of poll options for X (Twitter) video post. Will be sent as an array. Not for Text/Photos.',
				displayOptions: {
					show: {
						operation: ['uploadVideo'],
						platform: ['x']
					},
				},
			},
			{
				displayName: 'X Poll Reply Settings (Video)',
				name: 'xPollReplySettingsVideo',
				type: 'options',
				options: [
					{ name: 'Following', value: 'following' },
					{ name: 'Mentioned Users', value: 'mentionedUsers' },
					{ name: 'Everyone', value: 'everyone' },
				],
				default: 'following',
				description: 'Who can reply to the poll in X (Twitter) video post (following, mentionedUsers, everyone). Not for Text/Photos.',
				displayOptions: {
					show: {
						operation: ['uploadVideo'],
						platform: ['x']
					},
				},
			},
			{
				displayName: 'X Post URL (Text)',
				name: 'xPostUrlText',
				type: 'string',
				default: '',
				description: 'URL to attach to the X (Twitter) text post. Only for Upload Text.',
				displayOptions: {
					show: {
						operation: ['uploadText'],
						platform: ['x']
					},
				},
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			const operation = this.getNodeParameter('operation', i) as string;
			const isUploadOperation = ['uploadPhotos', 'uploadVideo', 'uploadText'].includes(operation);
			const needsUser = isUploadOperation || operation === 'generateJwt';
			const user = needsUser ? (this.getNodeParameter('user', i) as string) : '';
			let platforms = isUploadOperation ? (this.getNodeParameter('platform', i) as string[]) : [];
			const title = isUploadOperation ? (this.getNodeParameter('title', i) as string) : '';

			let endpoint = '';
			let method: 'GET' | 'POST' | 'DELETE' = 'POST';
			const formData: IDataObject = {};
			const qs: IDataObject = {};
			const body: IDataObject = {};

			if (isUploadOperation) {
				formData.user = user;
				formData.title = title;

				// Optional scheduling
				const scheduledDate = this.getNodeParameter('scheduledDate', i) as string | undefined;
				if (scheduledDate) {
					let normalizedDate = scheduledDate;
					// If the date string has no timezone info (no trailing Z and no +/- offset), append Z (UTC)
					const hasTimezone = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(normalizedDate);
					if (!hasTimezone) {
						normalizedDate = `${normalizedDate}Z`;
					}
					formData.scheduled_date = normalizedDate;
				}

				// Async processing toggle
				const uploadAsync = this.getNodeParameter('uploadAsync', i) as boolean | undefined;
				if (uploadAsync !== undefined) {
					formData.async_upload = String(uploadAsync);
				}
			}

			switch (operation) {
				case 'uploadPhotos':
					endpoint = '/upload_photos';
					const photoCaption = this.getNodeParameter('caption', i) as string | undefined;

					// Handle 'photos' parameter which can be string or string[]
					let photosInput = this.getNodeParameter('photos', i, []) as string | string[];
					let photosToProcess: string[];

					if (typeof photosInput === 'string') {
						// If it's a string, split by comma for multiple items, trim, and filter empty.
						// This handles cases like "url1,url2" or "{{$binary.data1}},{{$binary.data2}}"
						// or a single item like "url1" or "{{$binary.data1}}".
						photosToProcess = photosInput.split(',').map(item => item.trim()).filter(item => item !== '');
					} else {
						// It's already string[] (from "Add Field" or if the parameter somehow became an array),
						// filter out any non-string or empty string items.
						photosToProcess = photosInput.filter(item => typeof item === 'string' && item.trim() !== '');
					}

					const allowedPhotoPlatforms = ['tiktok', 'instagram', 'linkedin', 'facebook', 'x', 'threads'];
					platforms = platforms.filter(p => allowedPhotoPlatforms.includes(p));
					formData['platform[]'] = platforms;

					if (photosToProcess.length > 0) {
						const photoArray: Array<string | { value: Buffer; options: { filename: string; contentType?: string } }> = [];
						for (const photoItem of photosToProcess) {
							// Ensure photoItem is a non-empty string before processing
							if (typeof photoItem === 'string' && photoItem) {
								if (photoItem.toLowerCase().startsWith('http://') || photoItem.toLowerCase().startsWith('https://')) {
									// It's a URL
									photoArray.push(photoItem);
								} else {
									// Assume it's a binary property name
									const binaryPropertyName = photoItem;
									try {
										const binaryBuffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
										const binaryFileDetails = items[i].binary![binaryPropertyName];
										photoArray.push({
											value: binaryBuffer,
											options: {
												filename: binaryFileDetails.fileName ?? binaryPropertyName,
												contentType: binaryFileDetails.mimeType,
											},
										});
									} catch (error) {
										// Log a warning if binary data for the given property name is not found
										this.logger.warn(`[UploadPost Node] Could not find binary data for property '${binaryPropertyName}' in item ${i}. Error: ${error.message}`);
										// Optionally, you could decide to throw an error or add the photoItem as a string if that's desired fallback behavior.
										// For now, we'll just skip this item if the binary data isn't found to prevent sending a non-URL string.
									}
								}
							}
						}
						// Only add 'photos[]' to formData if there are items in photoArray
						if (photoArray.length > 0) {
							formData['photos[]'] = photoArray;
						}
					}
					if (photoCaption) formData.caption = photoCaption;
					break;
				case 'uploadVideo':
					endpoint = '/upload';
					const videoInput = this.getNodeParameter('video', i) as string;
					
					const allowedVideoPlatforms = ['tiktok', 'instagram', 'linkedin', 'youtube', 'facebook', 'x', 'threads', 'pinterest'];
					platforms = platforms.filter(p => allowedVideoPlatforms.includes(p));
					formData['platform[]'] = platforms;

					if (videoInput) {
						if (videoInput.toLowerCase().startsWith('http://') || videoInput.toLowerCase().startsWith('https://')) {
							// It's a URL
							formData.video = videoInput;
						} else {
							// Assume it's a binary property name
							const binaryPropertyName = videoInput;
							try {
								const binaryBuffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
								const binaryFileDetails = items[i].binary![binaryPropertyName];
								formData.video = {
									value: binaryBuffer,
									options: {
										filename: binaryFileDetails.fileName ?? binaryPropertyName,
										contentType: binaryFileDetails.mimeType,
									},
								};
							} catch (error) {
								this.logger.warn(`[UploadPost Node] Could not find binary data for video property '${binaryPropertyName}' in item ${i}. Error: ${error.message}`);
								// If the video field is mandatory for the API, not adding it here might cause an API error.
								// You might want to throw an error if binaryData is essential:
								// throw new NodeApiError(this.getNode(), items[i].json, { message: `Binary data for video property '${binaryPropertyName}' not found.` });
							}
						}
					}
					break;
				case 'uploadText':
					endpoint = '/upload_text';
					const allowedTextPlatforms = ['x', 'linkedin', 'facebook', 'threads'];
					platforms = platforms.filter(p => allowedTextPlatforms.includes(p));
					formData['platform[]'] = platforms;
					break;
				case 'getStatus':
					method = 'GET';
					endpoint = '/uploadposts/status';
					qs.request_id = this.getNodeParameter('requestId', i) as string;
					break;
				case 'getHistory':
					method = 'GET';
					endpoint = '/uploadposts/history';
					const historyPage = this.getNodeParameter('historyPage', i) as number | undefined;
					qs.page = historyPage ?? 1;
					const historyLimit = this.getNodeParameter('historyLimit', i) as number | undefined;
					qs.limit = historyLimit ?? 20;
					break;

				case 'listUsers':
					method = 'GET';
					endpoint = '/uploadposts/users';
					break;
				case 'createUser':
					method = 'POST';
					endpoint = '/uploadposts/users';
					body.username = this.getNodeParameter('newUser', i) as string;
					break;
				case 'deleteUser':
					method = 'DELETE';
					endpoint = '/uploadposts/users';
					body.username = this.getNodeParameter('deleteUserId', i) as string;
					break;
				case 'generateJwt':
					method = 'POST';
					endpoint = '/uploadposts/users/generate-jwt';
					body.username = user;
					const redirectUrl = this.getNodeParameter('redirectUrl', i, '') as string;
					const logoImage = this.getNodeParameter('logoImage', i, '') as string;
					const redirectButtonText = this.getNodeParameter('redirectButtonText', i, '') as string;
					const jwtPlatforms = this.getNodeParameter('jwtPlatforms', i, []) as string[];
					if (redirectUrl) body.redirect_url = redirectUrl;
					if (logoImage) body.logo_image = logoImage;
					if (redirectButtonText) body.redirect_button_text = redirectButtonText;
					if (Array.isArray(jwtPlatforms) && jwtPlatforms.length > 0) body.platforms = jwtPlatforms;
					break;
				case 'validateJwt':
					method = 'POST';
					endpoint = '/uploadposts/users/validate-jwt';
					body.jwt = this.getNodeParameter('jwtToken', i) as string;
					break;
			}
			// Pinterest specific (only when uploading)
			if (isUploadOperation && platforms.includes('pinterest')) {
				const pinterestBoardId = this.getNodeParameter('pinterestBoardId', i) as string | undefined;
				if (pinterestBoardId) formData.pinterest_board_id = pinterestBoardId;
			}

			// Add platform specifics only for uploads
			if (isUploadOperation && platforms.includes('linkedin')) {
				const targetLinkedinPageId = this.getNodeParameter('targetLinkedinPageId', i) as string | undefined;
				if (targetLinkedinPageId) formData.target_linkedin_page_id = targetLinkedinPageId;
				if (operation === 'uploadPhotos') {
					const linkedinVisibility = this.getNodeParameter('linkedinVisibility', i) as string;
					if (linkedinVisibility === 'PUBLIC') {
						formData.visibility = 'PUBLIC';
					}
				} else if (operation === 'uploadVideo') {
					const linkedinVisibility = this.getNodeParameter('linkedinVisibility', i) as string;
					const linkedinDescription = this.getNodeParameter('linkedinDescription', i) as string | undefined;
					formData.visibility = linkedinVisibility;
					if (linkedinDescription) formData.description = linkedinDescription;
				}
			}

			if (isUploadOperation && platforms.includes('facebook')) {
				const facebookPageId = this.getNodeParameter('facebookPageId', i) as string;
				formData.facebook_page_id = facebookPageId;
				if (operation === 'uploadVideo') {
					const facebookVideoDescription = this.getNodeParameter('facebookVideoDescription', i) as string | undefined;
					const facebookVideoState = this.getNodeParameter('facebookVideoState', i) as string | undefined;
					if (facebookVideoDescription) formData.description = facebookVideoDescription;
					if (facebookVideoState) formData.video_state = facebookVideoState;
				} else if (operation === 'uploadText') {
					const facebookLink = this.getNodeParameter('facebookLink', i) as string | undefined;
					if (facebookLink) formData.link = facebookLink;
				}
			}

			if (isUploadOperation && platforms.includes('tiktok')) {
				if (operation === 'uploadPhotos') {
					const tiktokAutoAddMusic = this.getNodeParameter('tiktokAutoAddMusic', i) as boolean | undefined;
					const tiktokDisableComment = this.getNodeParameter('tiktokDisableComment', i) as boolean | undefined;
					const tiktokBrandedContentPhoto = this.getNodeParameter('tiktokBrandedContentPhoto', i) as boolean | undefined;
					const tiktokDiscloseCommercialPhoto = this.getNodeParameter('tiktokDiscloseCommercialPhoto', i) as boolean | undefined;
					const tiktokPhotoCoverIndex = this.getNodeParameter('tiktokPhotoCoverIndex', i) as number | undefined;
					const tiktokPhotoDescription = this.getNodeParameter('tiktokPhotoDescription', i) as string | undefined;

					if (tiktokAutoAddMusic !== undefined) formData.auto_add_music = String(tiktokAutoAddMusic);
					if (tiktokDisableComment !== undefined) formData.disable_comment = String(tiktokDisableComment);
					if (tiktokBrandedContentPhoto !== undefined) formData.branded_content = String(tiktokBrandedContentPhoto);
					if (tiktokDiscloseCommercialPhoto !== undefined) formData.disclose_commercial = String(tiktokDiscloseCommercialPhoto);
					if (tiktokPhotoCoverIndex !== undefined) formData.photo_cover_index = tiktokPhotoCoverIndex;
					if (tiktokPhotoDescription) formData.description = tiktokPhotoDescription;
					
				} else if (operation === 'uploadVideo') {
					const tiktokPrivacyLevel = this.getNodeParameter('tiktokPrivacyLevel', i) as string | undefined;
					const tiktokDisableDuet = this.getNodeParameter('tiktokDisableDuet', i) as boolean | undefined;
					const tiktokDisableComment = this.getNodeParameter('tiktokDisableComment', i) as boolean | undefined;
					const tiktokDisableStitch = this.getNodeParameter('tiktokDisableStitch', i) as boolean | undefined;
					const tiktokCoverTimestamp = this.getNodeParameter('tiktokCoverTimestamp', i) as number | undefined;
					const tiktokBrandContentToggle = this.getNodeParameter('tiktokBrandContentToggle', i) as boolean | undefined;
					const tiktokBrandOrganic = this.getNodeParameter('tiktokBrandOrganic', i) as boolean | undefined;
					const tiktokBrandedContentVideo = this.getNodeParameter('tiktokBrandedContentVideo', i) as boolean | undefined;
					const tiktokBrandOrganicToggle = this.getNodeParameter('tiktokBrandOrganicToggle', i) as boolean | undefined;
					const tiktokIsAigc = this.getNodeParameter('tiktokIsAigc', i) as boolean | undefined;

					if (tiktokPrivacyLevel) formData.privacy_level = tiktokPrivacyLevel;
					if (tiktokDisableDuet !== undefined) formData.disable_duet = String(tiktokDisableDuet);
					if (tiktokDisableComment !== undefined) formData.disable_comment = String(tiktokDisableComment);
					if (tiktokDisableStitch !== undefined) formData.disable_stitch = String(tiktokDisableStitch);
					if (tiktokCoverTimestamp !== undefined) formData.cover_timestamp = tiktokCoverTimestamp;
					if (tiktokBrandContentToggle !== undefined) formData.brand_content_toggle = String(tiktokBrandContentToggle);
					if (tiktokBrandOrganic !== undefined) formData.brand_organic = String(tiktokBrandOrganic);
					if (tiktokBrandedContentVideo !== undefined) formData.branded_content = String(tiktokBrandedContentVideo);
					if (tiktokBrandOrganicToggle !== undefined) formData.brand_organic_toggle = String(tiktokBrandOrganicToggle);
					if (tiktokIsAigc !== undefined) formData.is_aigc = String(tiktokIsAigc);
				}
			}

			if (isUploadOperation && platforms.includes('instagram')) {
				const instagramMediaTypeInput = this.getNodeParameter('instagramMediaType', i) as string | undefined;
				let finalInstagramMediaType = instagramMediaTypeInput;

				if (operation === 'uploadPhotos') {
					if (!instagramMediaTypeInput || !['IMAGE', 'STORIES'].includes(instagramMediaTypeInput) ) {
						finalInstagramMediaType = 'IMAGE';
					}
				} else if (operation === 'uploadVideo') {
					if (!instagramMediaTypeInput || !['REELS', 'STORIES'].includes(instagramMediaTypeInput)) {
						finalInstagramMediaType = 'REELS';
					}
				}
				if (finalInstagramMediaType) formData.media_type = finalInstagramMediaType;
				
				if (operation === 'uploadVideo') {
					const instagramShareToFeed = this.getNodeParameter('instagramShareToFeed', i) as boolean | undefined;
					const instagramCollaborators = this.getNodeParameter('instagramCollaborators', i) as string | undefined;
					const instagramCoverUrl = this.getNodeParameter('instagramCoverUrl', i) as string | undefined;
					const instagramAudioName = this.getNodeParameter('instagramAudioName', i) as string | undefined;
					const instagramUserTags = this.getNodeParameter('instagramUserTags', i) as string | undefined;
					const instagramLocationId = this.getNodeParameter('instagramLocationId', i) as string | undefined;
					const instagramThumbOffset = this.getNodeParameter('instagramThumbOffset', i) as string | undefined;

					if (instagramShareToFeed !== undefined) formData.share_to_feed = String(instagramShareToFeed);
					if (instagramCollaborators) formData.collaborators = instagramCollaborators;
					if (instagramCoverUrl) formData.cover_url = instagramCoverUrl;
					if (instagramAudioName) formData.audio_name = instagramAudioName;
					if (instagramUserTags) formData.user_tags = instagramUserTags;
					if (instagramLocationId) formData.location_id = instagramLocationId;
					if (instagramThumbOffset) formData.thumb_offset = instagramThumbOffset;
				}
			}

			if (isUploadOperation && platforms.includes('youtube') && operation === 'uploadVideo') {
				const youtubeDescription = this.getNodeParameter('youtubeDescription', i) as string | undefined;
				const youtubeTagsRaw = this.getNodeParameter('youtubeTags', i) as string | undefined;
				const youtubeCategoryId = this.getNodeParameter('youtubeCategoryId', i) as string | undefined;
				const youtubePrivacyStatus = this.getNodeParameter('youtubePrivacyStatus', i) as string | undefined;
				const youtubeEmbeddable = this.getNodeParameter('youtubeEmbeddable', i) as boolean | undefined;
				const youtubeLicense = this.getNodeParameter('youtubeLicense', i) as string | undefined;
				const youtubePublicStatsViewable = this.getNodeParameter('youtubePublicStatsViewable', i) as boolean | undefined;
				const youtubeMadeForKids = this.getNodeParameter('youtubeMadeForKids', i) as boolean | undefined;
				const youtubeThumbnail = this.getNodeParameter('youtubeThumbnail', i) as string | undefined;

				if (youtubeDescription) formData.description = youtubeDescription;
				if (youtubeTagsRaw) formData.tags = youtubeTagsRaw.split(',').map(tag => tag.trim());
				if (youtubeCategoryId) formData.categoryId = youtubeCategoryId;
				if (youtubePrivacyStatus) formData.privacyStatus = youtubePrivacyStatus;
				if (youtubeEmbeddable !== undefined) formData.embeddable = String(youtubeEmbeddable);
				if (youtubeLicense) formData.license = youtubeLicense;
				if (youtubePublicStatsViewable !== undefined) formData.publicStatsViewable = String(youtubePublicStatsViewable);
				if (youtubeMadeForKids !== undefined) formData.madeForKids = String(youtubeMadeForKids);

				if (youtubeThumbnail) {
					if (youtubeThumbnail.toLowerCase().startsWith('http://') || youtubeThumbnail.toLowerCase().startsWith('https://')) {
						formData.thumbnail_url = youtubeThumbnail;
					} else {
						const binaryPropertyName = youtubeThumbnail;
						try {
							const binaryBuffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
							const binaryFileDetails = items[i].binary![binaryPropertyName];
							formData.thumbnail = {
								value: binaryBuffer,
								options: {
									filename: binaryFileDetails.fileName ?? binaryPropertyName,
									contentType: binaryFileDetails.mimeType,
								},
							};
						} catch (error) {
							this.logger.warn(`[UploadPost Node] Could not find binary data for YouTube thumbnail property '${binaryPropertyName}' in item ${i}. Error: ${error.message}`);
						}
					}
				}
			}

			if (isUploadOperation && platforms.includes('threads')) {
				if (operation === 'uploadVideo'){
					const threadsDescription = this.getNodeParameter('threadsDescription', i) as string | undefined;
					if (threadsDescription) formData.description = threadsDescription;
				}
			}

			if (isUploadOperation && platforms.includes('x')) {
				if (operation === 'uploadText') {
					const xPostUrlText = this.getNodeParameter('xPostUrlText', i) as string | undefined;
					if (xPostUrlText) formData.post_url = xPostUrlText;
					
					const xTaggedUserIdsText = this.getNodeParameter('xTaggedUserIds', i) as string | undefined;
					const xReplySettingsText = this.getNodeParameter('xReplySettings', i) as string | undefined;
					if (xTaggedUserIdsText) formData.tagged_user_ids = xTaggedUserIdsText.split(',').map(id => id.trim());
					if (xReplySettingsText) formData.reply_settings = xReplySettingsText;
					
					delete formData.nullcast;
					delete formData.place_id;
					delete formData.poll_duration;
					delete formData.poll_options;
					delete formData.poll_reply_settings;
				} else if (operation === 'uploadVideo') {
					const xTaggedUserIds = this.getNodeParameter('xTaggedUserIds', i) as string | undefined;
					const xReplySettings = this.getNodeParameter('xReplySettings', i) as string | undefined;
					const xNullcastVideo = this.getNodeParameter('xNullcastVideo', i) as boolean | undefined;
					const xPlaceIdVideo = this.getNodeParameter('xPlaceIdVideo', i) as string | undefined;
					const xPollDurationVideo = this.getNodeParameter('xPollDurationVideo', i) as number | undefined;
					const xPollOptionsVideoRaw = this.getNodeParameter('xPollOptionsVideo', i) as string | undefined;
					const xPollReplySettingsVideo = this.getNodeParameter('xPollReplySettingsVideo', i) as string | undefined;

					if (xTaggedUserIds) formData.tagged_user_ids = xTaggedUserIds.split(',').map(id => id.trim());
					if (xReplySettings) formData.reply_settings = xReplySettings;
					if (xNullcastVideo !== undefined) formData.nullcast = String(xNullcastVideo);
					if (xPlaceIdVideo) formData.place_id = xPlaceIdVideo;
					if (xPollDurationVideo !== undefined) formData.poll_duration = xPollDurationVideo;
					if (xPollOptionsVideoRaw) formData.poll_options = xPollOptionsVideoRaw.split(',').map(opt => opt.trim());
					if (xPollReplySettingsVideo) formData.poll_reply_settings = xPollReplySettingsVideo;
				}
			}

			const credentials = await this.getCredentials('uploadPostApi');
			const apiKey = credentials.apiKey as string;

			const options: IRequestOptions = {
				uri: `https://api.upload-post.com/api${endpoint}`,
				method,
				headers: {},
				json: true,
			};

			// Set auth header according to endpoint
			if (operation === 'validateJwt') {
				const jwt = this.getNodeParameter('jwtToken', i) as string;
				(options.headers as any)['Authorization'] = `Bearer ${jwt}`;
			} else {
				(options.headers as any)['Authorization'] = `ApiKey ${apiKey}`;
			}

			// Decide payload container
			if (method === 'POST') {
				// Upload endpoints use multipart form-data, others JSON body
				if (operation === 'uploadPhotos' || operation === 'uploadVideo' || operation === 'uploadText') {
					(options as any).formData = formData;
				} else {
					(options as any).body = body;
				}
			} else if (method === 'GET' || method === 'DELETE') {
				// Some DELETE endpoints accept JSON in body (delete user), but stick to body for deleteUser
				if (operation === 'deleteUser') {
					(options as any).body = body;
				} else {
					(options as any).qs = qs;
				}
			}

			const responseData = await this.helpers.request(options);

			// Handle optional polling after upload
			const shouldConsiderPolling = operation === 'uploadPhotos' || operation === 'uploadVideo' || operation === 'uploadText';
			const waitForCompletion = shouldConsiderPolling ? (this.getNodeParameter('waitForCompletion', i, false) as boolean) : false;
			let finalData: any = responseData;
			if (shouldConsiderPolling && waitForCompletion) {
				const maybeRequestId = (responseData && (responseData as any).request_id) ? (responseData as any).request_id as string : undefined;
				if (maybeRequestId) {
					const requestId = maybeRequestId;
					const pollIntervalSec = this.getNodeParameter('pollInterval', i, 10) as number;
					const pollTimeoutSec = this.getNodeParameter('pollTimeout', i, 600) as number;
					const start = Date.now();
					while (true) {
						await new Promise(res => (globalThis as any).setTimeout(res, Math.max(1, pollIntervalSec) * 1000));
						if (Date.now() - start > Math.max(5, pollTimeoutSec) * 1000) {
							finalData = { success: false, message: 'Polling timed out', request_id: requestId };
							break;
						}
						const statusOptions: IRequestOptions = {
							uri: `https://api.upload-post.com/api/uploadposts/status`,
							method: 'GET',
							headers: { 'Authorization': `ApiKey ${apiKey}` },
							qs: { request_id: requestId },
							json: true,
						};
						const statusData = await this.helpers.request(statusOptions);
						finalData = statusData;
						const statusValue = (statusData && (statusData as any).status) as string | undefined;
						if ((statusData as any).success === true || (statusValue && ['success','completed','failed','error'].includes(statusValue.toLowerCase()))) {
							break;
						}
					}
				}
			}

			returnData.push({
				json: finalData,
				pairedItem: {
					item: i,
				},
			});
		}

		return [returnData];
	}
}

