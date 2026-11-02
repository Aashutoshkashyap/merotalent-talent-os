import { z } from 'zod';

export const questionSchema=z.object({
  id:z.string().uuid().optional(), question:z.string().trim().min(1).max(20000),
  question_type:z.enum(['single','multiple','boolean','numerical','short_text']),
  options:z.array(z.object({id:z.string().regex(/^[a-zA-Z0-9_-]{1,50}$/),text:z.string().max(10000),image_file_id:z.string().uuid().nullable().optional()}).strict()).max(20).default([]),
  correct_answer:z.string().max(10000), points:z.number().min(0.01).max(10000),
  answer_rules:z.object({negative_marks:z.number().min(0).max(10000).default(0),tolerance:z.number().min(0).max(1000).default(0),
    partial_credit:z.boolean().default(false),case_sensitive:z.boolean().default(false),explanation:z.string().max(10000).default('')}).strict(),
  media_file_id:z.string().uuid().nullable().default(null),status:z.enum(['draft','published','archived']).default('draft'),
}).strict().superRefine((q,ctx)=>{
  const ids=q.options.map(o=>o.id);
  if(new Set(ids).size!==ids.length)ctx.addIssue({code:'custom',message:'Option identifiers must be unique.'});
  if(['single','multiple','boolean'].includes(q.question_type)){
    let answers:string[]=[];try{answers=q.question_type==='multiple'?JSON.parse(q.correct_answer):[q.correct_answer];}catch{/* invalid below */}
    if(!Array.isArray(answers)||!answers.length||answers.some(a=>!ids.includes(a))||new Set(answers).size!==answers.length)
      ctx.addIssue({code:'custom',message:'Select valid correct answer options.'});
    if(ids.length<2)ctx.addIssue({code:'custom',message:'Provide at least two options.'});
  }
  if(q.question_type==='numerical'&&(!q.correct_answer.trim()||!Number.isFinite(Number(q.correct_answer))))ctx.addIssue({code:'custom',message:'Provide a finite numerical answer.'});
  if(q.question_type==='short_text'&&!q.correct_answer.trim())ctx.addIssue({code:'custom',message:'Provide a non-empty text answer.'});
  if(q.question_type==='boolean'&&ids.length!==2)ctx.addIssue({code:'custom',message:'True/false questions require two options.'});
});
export type AssessmentQuestion=z.infer<typeof questionSchema>&{id:string};
export type StudentAnswer=string|string[];
export function publicQuestion(q:AssessmentQuestion){return{id:q.id,question:q.question,question_type:q.question_type,options:q.options,points:q.points,media_file_id:q.media_file_id};}
export function scoreQuestion(q:AssessmentQuestion,answer:StudentAnswer|undefined):number{
  if(answer===undefined||answer===''||(Array.isArray(answer)&&answer.length===0))return 0;
  let correct=false,partial=0;
  if(q.question_type==='multiple'){
    const expected=JSON.parse(q.correct_answer) as string[],given=Array.isArray(answer)?[...new Set(answer)]:[];
    correct=expected.length===given.length&&expected.every(a=>given.includes(a));
    if(!correct&&q.answer_rules.partial_credit&&given.length&&given.every(a=>expected.includes(a)))partial=q.points*given.length/expected.length;
  }else if(typeof answer==='string'){
    if(q.question_type==='numerical')correct=!!answer.trim()&&Number.isFinite(Number(answer))&&Math.abs(Number(answer)-Number(q.correct_answer))<=q.answer_rules.tolerance+1e-10;
    else if(q.question_type==='short_text')correct=q.answer_rules.case_sensitive?answer.trim()===q.correct_answer.trim():answer.trim().toLocaleLowerCase()===q.correct_answer.trim().toLocaleLowerCase();
    else correct=answer===q.correct_answer;
  }
  return Math.round((correct?q.points:partial||-q.answer_rules.negative_marks)*100)/100;
}
export function gradeAssessment(questions:AssessmentQuestion[],answers:Record<string,StudentAnswer>){
  const results=questions.map(q=>({question_id:q.id,marks:scoreQuestion(q,answers[q.id])}));
  return{score:Math.round(results.reduce((n,r)=>n+r.marks,0)*100)/100,total:Math.round(questions.reduce((n,q)=>n+q.points,0)*100)/100,results};
}
export function resultVisibility(activity:{results_publish_at:Date|string|null;review_answers:boolean;closes_at:Date|string},now:Date){
  const published=activity.results_publish_at!==null&&new Date(activity.results_publish_at)<=now;
  return{published,review:published&&activity.review_answers&&new Date(activity.closes_at)<now};
}
