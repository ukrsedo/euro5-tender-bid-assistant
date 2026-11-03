import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveTenderInternalId} from '../worker.js';

const TENDER='UA-2026-10-29-008698-a';
const INTERNAL='1234567890abcdef1234567890abcdef';

test('summary success remains the primary lookup', async()=>{
  const calls=[];
  const fetcher=async url=>{
    calls.push(String(url));
    return new Response(JSON.stringify({data:{id:INTERNAL}}),{
      status:200,
      headers:{'Content-Type':'application/json'}
    });
  };
  const result=await resolveTenderInternalId(TENDER,fetcher);
  assert.equal(result.internalId,INTERNAL);
  assert.equal(result.lookupSource,'summary');
  assert.equal(calls.length,1);
});

test('HTTP 525 falls back to official Public API feed', async()=>{
  const calls=[];
  const fetcher=async url=>{
    const u=String(url);calls.push(u);
    if(u.includes('/summary')) return new Response('SSL handshake failed',{status:525});
    return new Response(JSON.stringify({
      data:[
        {id:'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',tenderID:'UA-2026-10-29-000001-a'},
        {id:INTERNAL,tenderID:TENDER,dateCreated:'2026-10-29T14:49:52+02:00'}
      ],
      next_page:{}
    }),{status:200,headers:{'Content-Type':'application/json'}});
  };
  const result=await resolveTenderInternalId(TENDER,fetcher);
  assert.equal(result.internalId,INTERNAL);
  assert.equal(result.lookupSource,'public-api-feed');
  assert.equal(calls.length,2);
  assert.match(calls[1],/^https:\/\/public-api\.prozorro\.gov\.ua\/api\/2\.5\/tenders/);
  assert.match(calls[1],/opt_fields=tenderID,dateCreated/);
});

test('infrastructure failure is not reported as a nonexistent tender', async()=>{
  const fetcher=async url=>{
    if(String(url).includes('/summary')) return new Response('SSL handshake failed',{status:525});
    return new Response(JSON.stringify({data:[],next_page:{}}),{
      status:200,
      headers:{'Content-Type':'application/json'}
    });
  };
  await assert.rejects(
    ()=>resolveTenderInternalId(TENDER,fetcher),
    err=>{
      assert.match(err.message,/тимчасову помилку Prozorro/);
      assert.match(err.message,/HTTP 525/);
      return true;
    }
  );
});
