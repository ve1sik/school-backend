import { useEffect, useState } from 'react';

import { useNavigate } from 'react-router-dom';

import { MessageCircle, Loader2 } from 'lucide-react';

import axios from 'axios';

import { getTokenConfig } from '../lib/auth';



import { API_URL, SITE_ORIGIN, resolveUploadUrl } from '../lib/api';



type Props = {

  courseTitle?: string;

  lessonTitle?: string;

  questionLabel?: string;

  blockIndex?: number;

  className?: string;

};



export default function AskCuratorButton({

  courseTitle,

  lessonTitle,

  questionLabel,

  blockIndex,

  className = '',

}: Props) {

  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);

  const [curatorId, setCuratorId] = useState<string | null>(null);



  useEffect(() => {

    let cancelled = false;

    (async () => {

      try {

        const res = await axios.get(`${API_URL}/groups/my-membership`, getTokenConfig());

        const contact = res.data?.supportContact || res.data?.curator || res.data?.teacher;

        if (!cancelled && contact?.id) setCuratorId(String(contact.id));

      } catch {

        /* no group yet */

      }

    })();

    return () => {

      cancelled = true;

    };

  }, []);



  const buildPrefill = () => {

    const parts = ['Здравствуйте! Вопрос по заданию:'];

    if (courseTitle) parts.push(`Курс: ${courseTitle}`);

    if (lessonTitle) parts.push(`Урок: ${lessonTitle}`);

    if (blockIndex != null) parts.push(`Задание №${blockIndex + 1}`);

    if (questionLabel) parts.push(`Тема: ${questionLabel.replace(/<[^>]+>/g, ' ').trim()}`);

    parts.push('');

    parts.push('Мой вопрос: ');

    return parts.join('\n');

  };



  const handleClick = async () => {

    setLoading(true);

    try {

      let targetId = curatorId;

      if (!targetId) {

        const res = await axios.get(`${API_URL}/groups/my-membership`, getTokenConfig());

        const contact = res.data?.supportContact || res.data?.curator || res.data?.teacher;

        targetId = contact?.id ? String(contact.id) : null;

        if (targetId) setCuratorId(targetId);

      }

      if (!targetId) {

        navigate('/messages');

        return;

      }

      const prefill = encodeURIComponent(buildPrefill());

      navigate(`/messages?curator=${targetId}&prefill=${prefill}`);

    } finally {

      setLoading(false);

    }

  };



  return (

    <button

      type="button"

      onClick={handleClick}

      disabled={loading}

      className={`inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-black text-sm bg-indigo-50 text-[#5A4BFF] border border-indigo-100 hover:bg-indigo-100 transition-all active:scale-95 disabled:opacity-60 ${className}`}

    >

      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}

      Спросить куратора

    </button>

  );

}

