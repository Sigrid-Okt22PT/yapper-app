// ../js/posts.js
// Post helpers for Yapper (Noroff Social v2)
// Requires apiSocial from ./script.js

import { apiSocial } from "./script.js";

/**
 * List posts (feed).
 * @param {{page?:number, limit?:number, _author?:boolean, _reactions?:boolean, _comments?:boolean, _tag?:string}} [opts]
 * @returns {Promise<{data:Array<any>, meta:any}>}
 * @example
 * const { data, meta } = await listPosts({ page:1, limit:24, _author:true });
 */
export async function listPosts(opts = {}) {
  return apiSocial("/posts", { query: opts });
}

/**
 * Search posts by text query.
 * @param {string} q
 * @param {{page?:number, limit?:number, _author?:boolean, _reactions?:boolean, _comments?:boolean}} [opts]
 * @returns {Promise<{data:Array<any>, meta:any}>}
 * @example
 * const { data } = await searchPosts("react", { page:1, limit:12 });
 */
export async function searchPosts(q, opts = {}) {
  return apiSocial("/posts/search", { query: { q, ...opts } });
}

/**
 * Get a single post by ID.
 * @param {string|number} id
 * @param {{_author?:boolean, _reactions?:boolean, _comments?:boolean}} [opts]
 * @returns {Promise<{data:any, meta:any}>}
 * @example
 * const { data } = await getPost(123, { _author:true, _comments:true, _reactions:true });
 */
export async function getPost(id, opts = {}) {
  return apiSocial(`/posts/${encodeURIComponent(id)}`, { query: opts });
}

/**
 * Create a new post.
 * @param {{title:string, body?:string, media?:{url:string, alt?:string}, tags?:string[]}} payload
 * @returns {Promise<{data:any, meta:any}>}
 * @example
 * const { data } = await createPost({ title:"Hello", body:"World", tags:["intro"] });
 */
export async function createPost(payload) {
  return apiSocial("/posts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * Update an existing post (full update/replace semantics).
 * @param {string|number} id
 * @param {{title:string, body?:string, media?:{url:string, alt?:string}, tags?:string[]}} payload
 * @returns {Promise<{data:any, meta:any}>}
 * @example
 * await updatePost(123, { title:"Edited title", body:"New body" });
 */
export async function updatePost(id, payload) {
  return apiSocial(`/posts/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

/**
 * Delete a post by ID.
 * @param {string|number} id
 * @returns {Promise<void>}
 * @example
 * await deletePost(123);
 */
export async function deletePost(id) {
  await apiSocial(`/posts/${encodeURIComponent(id)}`, { method: "DELETE" });
}

/**
 * Create a comment on a post.
 * @param {string|number} id
 * @param {string} body
 * @returns {Promise<{data:any, meta:any}>}
 * @example
 * await createComment(123, "Nice post!");
 */
export async function createComment(id, body) {
  return apiSocial(`/posts/${encodeURIComponent(id)}/comment`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

/**
 * Delete a specific comment (if API supports it).
 * Some course APIs expose DELETE /posts/:postId/comment/:commentId.
 * If not available, omit using this and just leave the helper here as a reference.
 * @param {string|number} postId
 * @param {string|number} commentId
 * @returns {Promise<void>}
 * @example
 * await deleteComment(123, 456);
 */
export async function deleteComment(postId, commentId) {
  await apiSocial(`/posts/${encodeURIComponent(postId)}/comment/${encodeURIComponent(commentId)}`, {
    method: "DELETE",
  });
}
